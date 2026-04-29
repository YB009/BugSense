import { resolveWorkspacePath } from '@bugsense/config';

export function getIngestionRuntimeConfig() {
  return {
    port: parsePort(process.env.PORT, 3001),
    tcpHost: process.env.TCP_HOST ?? '127.0.0.1',
    tcpPort: parsePort(process.env.TCP_PORT, 4001),
    alertTcpHost: process.env.ALERT_TCP_HOST ?? '127.0.0.1',
    alertTcpPort: parsePort(process.env.ALERT_TCP_PORT, 4002),
    clickhouseUrl: requireUrlEnv('CLICKHOUSE_URL'),
    clickhouseDb: process.env.CLICKHOUSE_DB ?? 'bugsense',
    clickhouseUser: process.env.CLICKHOUSE_USER,
    clickhousePassword: process.env.CLICKHOUSE_PASSWORD,
    clickhouseRequestTimeoutMs: parsePort(
      process.env.CLICKHOUSE_REQUEST_TIMEOUT_MS,
      30000,
    ),
    clickhouseMaxRetries: parsePort(
      process.env.CLICKHOUSE_MAX_RETRIES,
      3,
    ),
    sourcemapStorageDir:
      process.env.SOURCEMAP_STORAGE_DIR ??
      resolveWorkspacePath('storage', 'sourcemaps'),
    redisConnection: parseRedisConnection(),
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

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRedisConnection() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: parsePort(parsed.port, 6379),
        username: parsed.username
          ? decodeURIComponent(parsed.username)
          : undefined,
        password: parsed.password
          ? decodeURIComponent(parsed.password)
          : undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null as null,
      };
    } catch {
      // Fall back to the individual Redis variables below.
    }
  }

  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parsePort(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as null,
  };
}
