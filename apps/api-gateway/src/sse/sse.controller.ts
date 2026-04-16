import {
  Controller,
  Get,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(
    private readonly authService: AuthService,
    private readonly sseService: SseService,
  ) {}

  @Sse('errors')
  async streamErrors(
    @Query('token') token: string | undefined,
  ): Promise<Observable<MessageEvent>> {
    if (!token) {
      throw new UnauthorizedException('Missing dashboard token');
    }

    await this.authService.verifyAccessToken(token);
    return this.sseService.createErrorStream();
  }

  @Get('errors/recent')
  async getRecentErrors(@Query('token') queryToken: string | undefined) {
    if (!queryToken) {
      throw new UnauthorizedException('Missing dashboard token');
    }

    await this.authService.verifyAccessToken(queryToken);
    return {
      events: await this.sseService.getRecentErrors(),
    };
  }
}
