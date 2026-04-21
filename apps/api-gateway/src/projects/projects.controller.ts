import {
  Controller,
  Body,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('health')
  getHealth() {
    return this.projectsService.getHealth();
  }

  @Get('transport/health')
  async getTransportHealth() {
    return this.projectsService.getTransportHealth();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listProjects(@Req() request: { user?: JwtUser }) {
    return {
      projects: await this.projectsService.listProjectsForUser(request.user!.sub),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createProject(
    @Req() request: { user?: JwtUser },
    @Body() payload: { name?: string },
  ) {
    return {
      project: await this.projectsService.createProjectForUser(
        request.user!.sub,
        payload?.name,
      ),
    };
  }

  @Get('internal/:projectId/alert-recipients')
  async getAlertRecipients(
    @Param('projectId') projectId: string,
    @Headers('x-bugsense-internal-token') token: string | undefined,
  ) {
    const config = getApiGatewayRuntimeConfig();
    if (!token || token !== config.internalServiceToken) {
      throw new UnauthorizedException('Invalid internal service token');
    }

    return {
      emails: await this.projectsService.getAlertRecipientEmails(projectId),
    };
  }
}
