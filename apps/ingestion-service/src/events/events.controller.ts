import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TRANSPORT_PATTERNS } from '@bugsense/types';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('health')
  getHealth() {
    return this.eventsService.getHealth();
  }

  @MessagePattern(TRANSPORT_PATTERNS.INGESTION_HEALTH)
  async getTransportHealth() {
    return this.eventsService.getTransportHealth();
  }
}
