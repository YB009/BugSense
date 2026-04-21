import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_TOKENS,
  TRANSPORT_PATTERNS,
  TransportHealthResponse,
} from '@bugsense/types';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
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

  async listProjectsForUser(userId: string) {
    const workspace = await this.workspaceStore.getUserWithProjects(userId);
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
}
