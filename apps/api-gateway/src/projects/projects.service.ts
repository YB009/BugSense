import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  getHealth() {
    return {
      service: 'api-gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

