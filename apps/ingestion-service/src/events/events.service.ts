import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_TOKENS,
  TRANSPORT_PATTERNS,
  TransportHealthResponse,
} from '@bugsense/types';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class EventsService {
  constructor(
    @Inject(SERVICE_TOKENS.ALERT)
    private readonly alertClient: ClientProxy,
  ) {}

  getHealth() {
    return {
      service: 'ingestion-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getTransportHealth() {
    const alertHealth = await lastValueFrom(
      this.alertClient.send<TransportHealthResponse>(
        TRANSPORT_PATTERNS.ALERT_HEALTH,
        {},
      ),
    );

    return {
      ...this.getHealth(),
      dependencies: [alertHealth],
    };
  }
}
