import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SourcemapUploadRequest } from '@bugsense/types';
import { ProjectApiKeyGuard } from '../auth/project-api-key.guard';
import { SourcemapsService } from './sourcemaps.service';

@Controller('sourcemaps')
export class SourcemapsController {
  constructor(private readonly sourcemapsService: SourcemapsService) {}

  @Post()
  @UseGuards(ProjectApiKeyGuard)
  async upload(@Body() payload: unknown) {
    return this.sourcemapsService.upload(payload as SourcemapUploadRequest);
  }
}
