import { loadEnvFiles, registerDevServicePort } from '@bugsense/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getIngestionRuntimeConfig } from './config/runtime-config';

async function bootstrap() {
  loadEnvFiles({ serviceName: 'ingestion-service', includeInfraEnv: true });
  const config = getIngestionRuntimeConfig();
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: config.tcpHost,
      port: config.tcpPort,
    },
  });

  await app.startAllMicroservices();
  const maxPort = config.port + 20;
  let httpPort = config.port;
  const reservedPorts = new Set([
    3000,
    3002,
    3003,
    4000,
    4001,
    config.tcpPort,
    config.alertTcpPort,
    parseOptionalPort(process.env.ALERT_SERVICE_HTTP_PORT),
    parseOptionalUrlPort(process.env.ALERT_SERVICE_URL),
  ]);

  while (true) {
    try {
      await app.listen(httpPort, '::');
      await registerDevServicePort({
        serviceName: 'ingestion-service',
        port: httpPort,
      });
      break;
    } catch (error) {
      const isBusyPort =
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'EADDRINUSE';

      if (!isBusyPort || httpPort >= maxPort) {
        throw error;
      }

      httpPort = nextCandidatePort(httpPort, reservedPorts, maxPort);
    }
  }

  if (httpPort !== config.port) {
    console.log(
      `Ingestion service HTTP port ${config.port} is busy. Using ${httpPort} instead.`,
    );
  } else {
    console.log(`Ingestion service HTTP server listening on port ${httpPort}`);
  }
}

void bootstrap();

function nextCandidatePort(
  currentPort: number,
  reservedPorts: Set<number>,
  maxPort: number,
) {
  let candidate = currentPort + 1;

  while (candidate <= maxPort && reservedPorts.has(candidate)) {
    candidate += 1;
  }

  return candidate;
}

function parseOptionalPort(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : -1;
}

function parseOptionalUrlPort(value: string | undefined) {
  if (!value) {
    return -1;
  }

  try {
    const url = new URL(value);
    return parseOptionalPort(url.port);
  } catch {
    return -1;
  }
}
