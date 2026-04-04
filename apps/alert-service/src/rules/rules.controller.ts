import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TRANSPORT_PATTERNS } from '@bugsense/types';
import { RulesService } from './rules.service';

@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get('health')
  getHealth() {
    return this.rulesService.getHealth();
  }

  @MessagePattern(TRANSPORT_PATTERNS.ALERT_HEALTH)
  getTransportHealth() {
    return this.rulesService.getHealth();
  }
}
