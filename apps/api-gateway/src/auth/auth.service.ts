import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';
import { WorkspaceStoreService } from './workspace-store.service';

export interface JwtUser {
  sub: string;
  email: string;
  role: 'admin';
  projectIds: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly workspaceStore: WorkspaceStoreService,
  ) {}

  async login(email: string | undefined, password: string | undefined) {
    if (!email || !password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const config = getApiGatewayRuntimeConfig();

    if (
      email !== config.dashboardAdminEmail ||
      password !== config.dashboardAdminPassword
    ) {
      const workspace = await this.workspaceStore.authenticatePasswordUser(
        email,
        password,
      );

      if (!workspace) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const user: JwtUser = {
        sub: workspace.user.id,
        email: workspace.user.email,
        role: 'admin',
        projectIds: workspace.projects.map((project) => project.id),
      };

      return {
        ...(await this.issueAccessToken(user)),
        authProvider: 'password',
      };
    }

    const workspace = await this.workspaceStore.ensureUserWithDefaultProject({
      email,
      authProvider: 'password',
    }).catch((error) => {
      if (!(error instanceof ServiceUnavailableException)) {
        throw error;
      }

      return null;
    });

    const user = workspace
      ? this.toJwtUser(workspace.user.id, workspace.user.email, workspace.projects)
      : this.buildFallbackAdminUser(email);

    return {
      ...(await this.issueAccessToken(user)),
      authProvider: 'password',
    };
  }

  async signup(email: string | undefined, password: string | undefined) {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPassword = password?.trim();

    if (!normalizedEmail || !normalizedPassword) {
      throw new BadRequestException('Email and password are required');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new BadRequestException('Enter a valid email address');
    }

    if (normalizedPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    let workspace;
    try {
      workspace = await this.workspaceStore.createPasswordUserWithDefaultProject(
        {
          email: normalizedEmail,
          password: normalizedPassword,
        },
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw error;
    }

    const user: JwtUser = {
      sub: workspace!.user.id,
      email: workspace!.user.email,
      role: 'admin',
      projectIds: workspace!.projects.map((project) => project.id),
    };

    return {
      ...(await this.issueAccessToken(user)),
      authProvider: 'password',
    };
  }

  async loginWithGoogle(idToken: string | undefined) {
    if (!idToken) {
      throw new UnauthorizedException('Missing Google credential');
    }

    const config = getApiGatewayRuntimeConfig();
    if (!config.googleClientId) {
      throw new UnauthorizedException('Google login is not configured');
    }

    const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        id_token: idToken,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google credential');
    }

    const payload = (await response.json()) as GoogleTokenInfo;
    if (payload.aud !== config.googleClientId) {
      throw new UnauthorizedException('Google credential audience mismatch');
    }

    if (payload.email_verified !== 'true' || !payload.email) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const email = payload.email.trim().toLowerCase();
    const isAdminEmail =
      email === config.dashboardAdminEmail.trim().toLowerCase();
    const domain = email.split('@')[1] ?? '';
    const isAllowedEmail = config.googleAllowedEmails.some(
      (entry) => entry.toLowerCase() === email,
    );
    const isAllowedDomain = config.googleAllowedDomains.some(
      (entry) => entry.toLowerCase() === domain.toLowerCase(),
    );

    if (
      !config.googleAllowSignup &&
      !isAdminEmail &&
      !isAllowedEmail &&
      !isAllowedDomain
    ) {
      throw new UnauthorizedException('Google account is not allowed');
    }

    const workspace = await this.workspaceStore.ensureUserWithDefaultProject({
      email,
      authProvider: 'google',
    }).catch((error) => {
      if (!(error instanceof ServiceUnavailableException) || !isAdminEmail) {
        throw error;
      }

      return null;
    });

    const user = workspace
      ? this.toJwtUser(workspace.user.id, email, workspace.projects)
      : this.buildFallbackAdminUser(email);

    return {
      ...(await this.issueAccessToken(user)),
      authProvider: 'google',
    };
  }

  async validateProjectApiKey(projectId: string, apiKey: string | undefined) {
    const config = getApiGatewayRuntimeConfig();
    const expectedApiKey = config.projectApiKeys[projectId];

    if (!apiKey) {
      throw new UnauthorizedException('Missing x-bugsense-api-key header');
    }

    const workspaceProject = await this.workspaceStore.getProjectForApiKey(
      projectId,
      apiKey,
    );
    if (workspaceProject) {
      return;
    }

    if (!expectedApiKey) {
      throw new UnauthorizedException('Unknown projectId');
    }

    if (expectedApiKey !== apiKey) {
      throw new UnauthorizedException('Invalid project API key');
    }
  }

  async verifyAccessToken(token: string) {
    try {
      const user = await this.jwtService.verifyAsync<JwtUser>(token);
      if (Array.isArray(user.projectIds)) {
        if (
          user.role === 'admin' &&
          user.email === getApiGatewayRuntimeConfig().dashboardAdminEmail &&
          !this.workspaceStore.isAvailable()
        ) {
          return {
            ...user,
            projectIds: this.getFallbackProjectIds(),
          };
        }

        return user;
      }

      const workspace = await this.workspaceStore.ensureUserWithDefaultProject({
        email: user.email,
        authProvider: 'google',
      }).catch((error) => {
        if (!(error instanceof ServiceUnavailableException)) {
          throw error;
        }

        return null;
      });

      if (!workspace) {
        return {
          ...user,
          projectIds: this.getFallbackProjectIds(),
        };
      }

      return {
        ...user,
        sub: workspace!.user.id,
        projectIds: workspace!.projects.map((project) => project.id),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private async issueAccessToken(user: JwtUser) {
    const config = getApiGatewayRuntimeConfig();

    return {
      accessToken: await this.jwtService.signAsync(user),
      tokenType: 'Bearer',
      expiresIn: config.jwtExpiresIn,
      user,
    };
  }

  private toJwtUser(
    sub: string,
    email: string,
    projects: Array<{ id: string }>,
  ): JwtUser {
    return {
      sub,
      email,
      role: 'admin',
      projectIds: projects.map((project) => project.id),
    };
  }

  private buildFallbackAdminUser(email: string): JwtUser {
    return {
      sub: `admin_${email.toLowerCase()}`,
      email,
      role: 'admin',
      projectIds: this.getFallbackProjectIds(),
    };
  }

  private getFallbackProjectIds() {
    return ['*'];
  }
}

interface GoogleTokenInfo {
  aud?: string;
  email?: string;
  email_verified?: string;
  sub?: string;
}
