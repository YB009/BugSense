import { loadEnvFiles } from '@bugsense/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getApiGatewayRuntimeConfig } from './config/runtime-config';

const express = require('express') as {
  json: (options: { limit: string }) => unknown;
  urlencoded: (options: { extended: boolean; limit: string }) => unknown;
};

async function bootstrap() {
  loadEnvFiles({ serviceName: 'api-gateway' });
  const config = getApiGatewayRuntimeConfig();
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  app.use((request: CorsRequest, response: CorsResponse, next: () => void) => {
    const origin = Array.isArray(request.headers.origin)
      ? request.headers.origin[0]
      : request.headers.origin;

    if (!origin) {
      next();
      return;
    }

    const isIngestRequest =
      request.path === '/ingest' || request.path.startsWith('/ingest/');
    const allowOrigin =
      isIngestRequest || isAllowedOrigin(origin, config.allowedOrigins);

    if (!allowOrigin) {
      if (request.method === 'OPTIONS') {
        response.status(403).send('Origin is not allowed by CORS.');
        return;
      }

      next();
      return;
    }

    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,x-bugsense-api-key',
    );

    if (request.method === 'OPTIONS') {
      response.status(204).send();
      return;
    }

    next();
  });
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: config.tcpHost,
      port: config.tcpPort,
    },
  });

  await app.startAllMicroservices();
  await app.listen(config.port, '0.0.0.0');
  console.log(`API Gateway HTTP server listening on port ${config.port}`);
}

void bootstrap();

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

interface CorsRequest {
  method: string;
  path: string;
  headers: {
    origin?: string | string[];
  };
}

interface CorsResponse {
  setHeader(name: string, value: string): void;
  status(code: number): {
    send(body?: string): void;
  };
}
