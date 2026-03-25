import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  getHealth() {
    return {
      service: 'ingestion-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

