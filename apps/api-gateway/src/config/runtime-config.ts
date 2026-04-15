import { resolveWorkspacePath } from '@bugsense/config';
import { parseProjectApiKeys } from '@bugsense/config';

export function getApiGatewayRuntimeConfig() {
  const allowedOrigins = parseAllowedOrigins(
    process.env.BUGSENSE_ALLOWED_ORIGINS,
    ['http://localhost:3005', 'http://localhost:4173'],
  );

  return {
    port: parsePort(process.env.PORT, 3000),
    dashboardOrigin: process.env.BUGSENSE_DASHBOARD_URL ?? 'http://localhost:3005',
    allowedOrigins,
    alertServiceUrl: process.env.ALERT_SERVICE_URL ?? 'http://127.0.0.1:3002',
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
    clickhouseUrl: process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123',
    clickhouseDb: process.env.CLICKHOUSE_DB ?? 'bugsense',
    clickhouseUser: process.env.CLICKHOUSE_USER,
    clickhousePassword: process.env.CLICKHOUSE_PASSWORD,
    geminiApiKey: process.env.GEMINI_API_KEY,
    aiPanelModel:
      process.env.BUGSENSE_AI_PANEL_MODEL ?? 'gemini-2.5-flash',
    issuesStoragePath:
      process.env.BUGSENSE_ISSUES_STORAGE_PATH ??
      resolveWorkspacePath('storage', 'issues', 'grouped-issues.json'),
  };
}

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAllowedOrigins(
  value: string | undefined,
  fallback: string[],
) {
  if (!value) {
    return fallback;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : fallback;
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
