import { loadEnvFiles, registerDevServicePort } from '@bugsense/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getAlertRuntimeConfig } from './config/runtime-config';

async function bootstrap() {
  loadEnvFiles({ serviceName: 'alert-service' });
  const config = getAlertRuntimeConfig();
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
    3001,
    3002,
    4000,
    4001,
    config.tcpPort,
  ]);

  while (true) {
    try {
      await app.listen(httpPort, '::');
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

  await registerDevServicePort({
    serviceName: 'alert-service',
    port: httpPort,
  });

  if (httpPort !== config.port) {
    console.log(
      `Alert service HTTP port ${config.port} is busy. Using ${httpPort} instead.`,
    );
  } else {
    console.log(`Alert service HTTP server listening on port ${httpPort}`);
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
