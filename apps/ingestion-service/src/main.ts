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
  const explicitPort = Boolean(process.env.PORT);
  const maxPort = config.port + 20;
  let httpPort = config.port;

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

      if (!isBusyPort || explicitPort || httpPort >= maxPort) {
        throw error;
      }

      httpPort += 1;
    }
  }

  if (httpPort !== config.port) {
    console.log(
      `Ingestion service HTTP port ${config.port} is busy. Using ${httpPort} instead.`,
    );
  }
}

void bootstrap();
