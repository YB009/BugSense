import { Injectable } from '@nestjs/common';

@Injectable()
export class RulesService {
  getHealth() {
    return {
      service: 'alert-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

