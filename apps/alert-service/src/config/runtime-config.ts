export function getAlertRuntimeConfig() {
  return {
    port: parsePort(process.env.PORT, 3002),
    tcpHost: process.env.TCP_HOST ?? '127.0.0.1',
    tcpPort: parsePort(process.env.TCP_PORT, 4002),
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
