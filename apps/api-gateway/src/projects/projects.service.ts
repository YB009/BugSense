import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  SERVICE_TOKENS,
  TRANSPORT_PATTERNS,
  TransportHealthResponse,
} from '@bugsense/types';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { JwtUser } from '../auth/auth.service';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';
import { WorkspaceStoreService } from '../auth/workspace-store.service';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(SERVICE_TOKENS.INGESTION)
    private readonly ingestionClient: ClientProxy,
    private readonly workspaceStore: WorkspaceStoreService,
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

  async listProjectsForUser(user: JwtUser) {
    if (!this.workspaceStore.isAvailable()) {
      return this.buildFallbackProjects(user.projectIds);
    }

    const workspace = await this.workspaceStore.getUserWithProjects(user.sub).catch((error) => {
      if (!(error instanceof ServiceUnavailableException)) {
        throw error;
      }

      return null;
    });

    if (!workspace) {
      return this.buildFallbackProjects(user.projectIds);
    }

    return (
      workspace?.projects.map((project) => ({
        id: project.id,
        name: project.name,
        apiKey: project.apiKey,
        createdAt: project.createdAt,
      })) ?? []
    );
  }

  async createProjectForUser(userId: string, rawName: string | undefined) {
    const name = rawName?.trim();
    if (!name) {
      throw new BadRequestException('Project name is required');
    }

    const project = await this.workspaceStore.createProjectForUser(userId, {
      name,
    });

    if (!project) {
      throw new BadRequestException('Project could not be created');
    }

    return {
      id: project.id,
      name: project.name,
      apiKey: project.apiKey,
      createdAt: project.createdAt,
    };
  }

  async getAlertRecipientEmails(projectId: string) {
    return this.workspaceStore.getAlertRecipientEmails(projectId);
  }

  private buildFallbackProjects(projectIds: string[]) {
    const config = getApiGatewayRuntimeConfig();

    return projectIds.map((projectId) => ({
      id: projectId,
      name: `${projectId} project`,
      apiKey: config.projectApiKeys[projectId] ?? '',
      createdAt: new Date(0).toISOString(),
    }));
  }
}
