import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { Pool, QueryResultRow } from 'pg';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';

export interface WorkspaceUser {
  id: string;
  email: string;
  name: string | null;
  authProvider: 'password' | 'google';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  apiKey: string;
  ownerUserId: string;
  memberUserIds: string[];
  alertEmailUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class WorkspaceStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly config = getApiGatewayRuntimeConfig();
  private readonly pool = this.createPool();

  async onModuleInit() {
    await this.migrate();
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async ensureUserWithDefaultProject(input: {
    email: string;
    name?: string | null;
    authProvider: WorkspaceUser['authProvider'];
  }) {
    const email = normalizeEmail(input.email);
    const now = new Date().toISOString();
    const userId = stableUserId(email);

    await this.query(
      `
        INSERT INTO bugsense_users (id, email, name, auth_provider, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $5)
        ON CONFLICT (email)
        DO UPDATE SET
          name = COALESCE(EXCLUDED.name, bugsense_users.name),
          auth_provider = EXCLUDED.auth_provider,
          updated_at = EXCLUDED.updated_at
      `,
      [userId, email, input.name ?? null, input.authProvider, now],
    );

    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new InternalServerErrorException('Failed to create workspace user');
    }

    const projects = await this.getProjectsForUser(user.id);
    if (projects.length === 0) {
      await this.createProjectForUser(user.id, {
        name: `${user.email.split('@')[0] || 'User'} project`,
      });
    }

    return this.getUserWithProjects(user.id);
  }

  async createPasswordUserWithDefaultProject(input: {
    email: string;
    password: string;
    name?: string | null;
  }) {
    const email = normalizeEmail(input.email);
    const existingUser = await this.getUserAuthRecordByEmail(email);

    if (existingUser?.password_hash) {
      throw new ConflictException('An account already exists for this email');
    }

    if (existingUser && existingUser.auth_provider === 'google') {
      throw new ConflictException(
        'This email is already registered with Google sign-in',
      );
    }

    const now = new Date().toISOString();
    const userId = existingUser?.id ?? stableUserId(email);
    const passwordHash = hashPassword(input.password);

    await this.query(
      `
        INSERT INTO bugsense_users (
          id,
          email,
          name,
          auth_provider,
          password_hash,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'password', $4, $5, $5)
        ON CONFLICT (email)
        DO UPDATE SET
          name = COALESCE(EXCLUDED.name, bugsense_users.name),
          auth_provider = 'password',
          password_hash = EXCLUDED.password_hash,
          updated_at = EXCLUDED.updated_at
      `,
      [userId, email, input.name ?? null, passwordHash, now],
    );

    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new InternalServerErrorException('Failed to create workspace user');
    }

    const projects = await this.getProjectsForUser(user.id);
    if (projects.length === 0) {
      await this.createProjectForUser(user.id, {
        name: `${user.email.split('@')[0] || 'User'} project`,
      });
    }

    return this.getUserWithProjects(user.id);
  }

  async authenticatePasswordUser(email: string, password: string) {
    const record = await this.getUserAuthRecordByEmail(normalizeEmail(email));

    if (!record?.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!verifyPassword(password, record.password_hash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.getUserWithProjects(record.id);
  }

  async getUserWithProjects(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    return {
      user,
      projects: await this.getProjectsForUser(user.id),
    };
  }

  async createProjectForUser(userId: string, input: { name: string }) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new InternalServerErrorException('Cannot create project for unknown user');
    }

    const now = new Date().toISOString();
    const projectId = `proj_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const apiKey = `key_${randomBytes(24).toString('base64url')}`;
    const name = input.name.trim() || `${user.email.split('@')[0]} project`;

    await this.query(
      `
        INSERT INTO bugsense_projects (
          id,
          name,
          api_key,
          owner_user_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $5)
      `,
      [projectId, name, apiKey, user.id, now],
    );
    await this.query(
      `
        INSERT INTO bugsense_project_members (
          project_id,
          user_id,
          role,
          email_alerts_enabled,
          created_at
        )
        VALUES ($1, $2, 'owner', true, $3)
      `,
      [projectId, user.id, now],
    );

    return this.getProjectById(projectId);
  }

  async getProjectForApiKey(projectId: string, apiKey: string) {
    const result = await this.query<ProjectRow>(
      `
        SELECT *
        FROM bugsense_projects
        WHERE id = $1 AND api_key = $2
        LIMIT 1
      `,
      [projectId, apiKey],
    );

    return result.rows[0] ? this.toProject(result.rows[0]) : null;
  }

  async getAlertRecipientEmails(projectId: string) {
    const result = await this.query<{ email: string }>(
      `
        SELECT u.email
        FROM bugsense_project_members pm
        INNER JOIN bugsense_users u ON u.id = pm.user_id
        WHERE pm.project_id = $1 AND pm.email_alerts_enabled = true
        ORDER BY u.email ASC
      `,
      [projectId],
    );

    return result.rows.map((row) => row.email);
  }

  private async getUserByEmail(email: string) {
    const result = await this.query<UserRow>(
      'SELECT * FROM bugsense_users WHERE email = $1 LIMIT 1',
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  private async getUserAuthRecordByEmail(email: string) {
    const result = await this.query<UserAuthRow>(
      `
        SELECT id, email, auth_provider, password_hash
        FROM bugsense_users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  private async getUserById(userId: string) {
    const result = await this.query<UserRow>(
      'SELECT * FROM bugsense_users WHERE id = $1 LIMIT 1',
      [userId],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  private async getProjectById(projectId: string) {
    const result = await this.query<ProjectRow>(
      'SELECT * FROM bugsense_projects WHERE id = $1 LIMIT 1',
      [projectId],
    );
    return result.rows[0] ? this.toProject(result.rows[0]) : null;
  }

  private async getProjectsForUser(userId: string) {
    const result = await this.query<ProjectRow>(
      `
        SELECT p.*
        FROM bugsense_projects p
        INNER JOIN bugsense_project_members pm ON pm.project_id = p.id
        WHERE pm.user_id = $1
        ORDER BY p.created_at ASC
      `,
      [userId],
    );

    return result.rows.map((row) => this.toProject(row));
  }

  private toProject(row: ProjectRow): WorkspaceProject {
    return {
      id: row.id,
      name: row.name,
      apiKey: row.api_key,
      ownerUserId: row.owner_user_id,
      memberUserIds: [],
      alertEmailUserIds: [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private async migrate() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS bugsense_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        auth_provider TEXT NOT NULL,
        password_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await this.query(`
      ALTER TABLE bugsense_users
      ADD COLUMN IF NOT EXISTS password_hash TEXT
    `);
    await this.query(`
      CREATE TABLE IF NOT EXISTS bugsense_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        owner_user_id TEXT NOT NULL REFERENCES bugsense_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await this.query(`
      CREATE TABLE IF NOT EXISTS bugsense_project_members (
        project_id TEXT NOT NULL REFERENCES bugsense_projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES bugsense_users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (project_id, user_id)
      )
    `);
  }

  private query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ) {
    if (!this.pool) {
      throw new InternalServerErrorException(
        'DATABASE_URL is required for workspace ownership storage',
      );
    }

    return this.pool.query<T>(sql, values);
  }

  private createPool() {
    if (!this.config.databaseUrl) {
      return null;
    }

    return new Pool({
      connectionString: this.config.databaseUrl,
      ssl: this.config.databaseSsl
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
    });
  }
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  auth_provider: WorkspaceUser['authProvider'];
  created_at: Date;
  updated_at: Date;
}

interface UserAuthRow {
  id: string;
  email: string;
  auth_provider: WorkspaceUser['authProvider'];
  password_hash: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  api_key: string;
  owner_user_id: string;
  created_at: Date;
  updated_at: Date;
}

function toUser(row: UserRow): WorkspaceUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    authProvider: row.auth_provider,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function stableUserId(email: string) {
  return `user_${createHash('sha256').update(email).digest('hex').slice(0, 24)}`;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, encodedHash: string) {
  const [salt, storedHash] = encodedHash.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHash, 'hex');

  if (candidate.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(candidate, expected);
}
