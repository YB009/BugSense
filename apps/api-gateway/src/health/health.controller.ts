import { Controller, Get } from '@nestjs/common';
import { WorkspaceStoreService } from '../auth/workspace-store.service';

@Controller()
export class HealthController {
  constructor(private readonly workspaceStore: WorkspaceStoreService) {}

  @Get('health')
  getHealth() {
    return {
      service: 'api-gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/db')
  async getDatabaseHealth() {
    const database = await this.workspaceStore.pingDatabase();

    return {
      ...this.getHealth(),
      database,
    };
  }
}
