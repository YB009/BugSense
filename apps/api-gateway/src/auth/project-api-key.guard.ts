import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class ProjectApiKeyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      body?: { projectId?: string };
      headers: Record<string, string | string[] | undefined>;
    }>();

    const projectId = request.body?.projectId;
    if (!projectId) {
      throw new UnauthorizedException('projectId is required in the request body');
    }

    const apiKeyHeader = request.headers['x-bugsense-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

    this.authService.validateProjectApiKey(projectId, apiKey);
    return true;
  }
}
