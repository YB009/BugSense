import { parseProjectApiKeys } from '@bugsense/config';

export function getApiGatewayRuntimeConfig() {
  return {
    port: parsePort(process.env.PORT, 3000),
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
  };
}

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
