import { resolveWorkspacePath } from '@bugsense/config';
import { parseProjectApiKeys } from '@bugsense/config';
import { isAbsolute } from 'path';

export function getApiGatewayRuntimeConfig() {
  const allowedOrigins = parseAllowedOrigins(
    requireEnv('BUGSENSE_ALLOWED_ORIGINS'),
  );

  return {
    port: parsePort(process.env.PORT, 3000),
    dashboardOrigin: requireUrlEnv('BUGSENSE_DASHBOARD_URL'),
    allowedOrigins,
    alertServiceUrl: requireUrlEnv('ALERT_SERVICE_URL'),
    tcpHost: process.env.TCP_HOST ?? '127.0.0.1',
    tcpPort: parsePort(process.env.TCP_PORT, 4000),
    ingestionTcpHost: process.env.INGESTION_TCP_HOST ?? '127.0.0.1',
    ingestionTcpPort: parsePort(process.env.INGESTION_TCP_PORT, 4001),
    projectApiKeys: parseProjectApiKeys(process.env.BUGSENSE_PROJECT_API_KEYS),
    jwtSecret: process.env.BUGSENSE_JWT_SECRET ?? 'dev-only-change-me',
    jwtExpiresIn: process.env.BUGSENSE_JWT_EXPIRES_IN ?? '1h',
    dashboardAdminEmail:
      process.env.BUGSENSE_DASHBOARD_ADMIN_EMAIL ?? 'admin@bugsense.dev',
    dashboardAdminPassword:
      process.env.BUGSENSE_DASHBOARD_ADMIN_PASSWORD ?? 'password',
    googleClientId: process.env.BUGSENSE_GOOGLE_CLIENT_ID,
    googleAllowedEmails: parseList(process.env.BUGSENSE_GOOGLE_ALLOWED_EMAILS),
    googleAllowedDomains: parseList(process.env.BUGSENSE_GOOGLE_ALLOWED_DOMAINS),
    googleAllowSignup: parseBoolean(
      process.env.BUGSENSE_GOOGLE_ALLOW_SIGNUP,
      false,
    ),
    clickhouseUrl: requireUrlEnv('CLICKHOUSE_URL'),
    clickhouseDb: process.env.CLICKHOUSE_DB ?? 'bugsense',
    clickhouseUser: process.env.CLICKHOUSE_USER,
    clickhousePassword: process.env.CLICKHOUSE_PASSWORD,
    geminiApiKey:
      process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY,
    aiPanelModel: normalizeGeminiModel(
      process.env.GOOGLE_AI_MODEL ??
        process.env.BUGSENSE_AI_PANEL_MODEL ??
        'gemini-2.5-flash',
    ),
    issuesStoragePath: resolveIssuesStoragePath(
      process.env.BUGSENSE_ISSUES_STORAGE_PATH,
    ),
    databaseUrl: process.env.DATABASE_URL,
    databaseSsl: parseBoolean(process.env.DATABASE_SSL, false),
    internalServiceToken:
      process.env.BUGSENSE_INTERNAL_SERVICE_TOKEN ??
      'dev-only-internal-token',
  };
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function requireUrlEnv(name: string) {
  const value = requireEnv(name);

  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

function resolveIssuesStoragePath(value: string | undefined) {
  if (!value) {
    return resolveWorkspacePath('storage', 'issues', 'grouped-issues.json');
  }

  if (isAbsolute(value)) {
    return value;
  }

  return resolveWorkspacePath(...value.split(/[\\/]+/).filter(Boolean));
}

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAllowedOrigins(value: string) {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('BUGSENSE_ALLOWED_ORIGINS must contain at least one origin');
  }

  return origins;
}

function parseList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  return value === 'true';
}

function normalizeGeminiModel(value: string) {
  switch (value.trim()) {
    case 'gemini-1.5-flash':
      return 'gemini-2.5-flash';
    case 'gemini-1.5-pro':
      return 'gemini-2.5-pro';
    default:
      return value.trim();
  }
}
