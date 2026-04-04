import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_TOKENS,
  TRANSPORT_PATTERNS,
  TransportHealthResponse,
} from '@bugsense/types';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(SERVICE_TOKENS.INGESTION)
    private readonly ingestionClient: ClientProxy,
  ) {}

  getHealth() {
    return {
      service: 'api-gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getTransportHealth() {
    const ingestionHealth = await lastValueFrom(
      this.ingestionClient.send<TransportHealthResponse>(
        TRANSPORT_PATTERNS.INGESTION_HEALTH,
        {},
      ),
    );

    return {
      ...this.getHealth(),
      dependencies: [ingestionHealth],
    };
  }
}
