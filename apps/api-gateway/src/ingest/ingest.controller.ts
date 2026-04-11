import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IngestEventRequest } from '@bugsense/types';
import { ProjectApiKeyGuard } from '../auth/project-api-key.guard';
import { IngestService } from './ingest.service';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  @UseGuards(ProjectApiKeyGuard)
  async ingest(@Body() payload: unknown) {
    return this.ingestService.ingest(payload as IngestEventRequest);
  }
}
