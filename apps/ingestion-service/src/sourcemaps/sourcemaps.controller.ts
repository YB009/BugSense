import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  SourcemapUploadRequest,
  TRANSPORT_PATTERNS,
} from '@bugsense/types';
import { SourcemapsService } from './sourcemaps.service';

@Controller()
export class SourcemapsController {
  constructor(private readonly sourcemapsService: SourcemapsService) {}

  @MessagePattern(TRANSPORT_PATTERNS.UPLOAD_SOURCEMAP)
  async uploadSourcemap(payload: SourcemapUploadRequest) {
    return this.sourcemapsService.uploadSourcemap(payload);
  }
}
