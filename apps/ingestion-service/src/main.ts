import { loadEnvFiles } from '@bugsense/config';
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
  await app.listen(config.port, '::');
}

void bootstrap();
