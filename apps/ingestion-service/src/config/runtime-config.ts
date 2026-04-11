export function getIngestionRuntimeConfig() {
  return {
    port: parsePort(process.env.PORT, 3001),
    tcpHost: process.env.TCP_HOST ?? '127.0.0.1',
    tcpPort: parsePort(process.env.TCP_PORT, 4001),
    alertTcpHost: process.env.ALERT_TCP_HOST ?? '127.0.0.1',
    alertTcpPort: parsePort(process.env.ALERT_TCP_PORT, 4002),
    clickhouseUrl: process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123',
    clickhouseDb: process.env.CLICKHOUSE_DB ?? 'bugsense',
    clickhouseUser: process.env.CLICKHOUSE_USER,
    clickhousePassword: process.env.CLICKHOUSE_PASSWORD,
    redisConnection: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: parsePort(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null as null,
    },
  };
}

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
