import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  SERVICE_TOKENS,
  SourcemapUploadRequest,
  SourcemapUploadResponse,
  TRANSPORT_PATTERNS,
} from '@bugsense/types';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class SourcemapsService {
  constructor(
    @Inject(SERVICE_TOKENS.INGESTION)
    private readonly ingestionClient: ClientProxy,
  ) {}

  async upload(payload: SourcemapUploadRequest) {
    const validatedPayload = validateSourcemapUpload(payload);

    return lastValueFrom(
      this.ingestionClient.send<SourcemapUploadResponse>(
        TRANSPORT_PATTERNS.UPLOAD_SOURCEMAP,
        validatedPayload,
      ),
    );
  }
}

function validateSourcemapUpload(
  payload: SourcemapUploadRequest,
): SourcemapUploadRequest {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Request body must be a JSON object');
  }

  if (!isNonEmptyString(payload.projectId)) {
    throw new BadRequestException('projectId is required');
  }

  if (!isNonEmptyString(payload.release)) {
    throw new BadRequestException('release is required');
  }

  if (!isNonEmptyString(payload.fileName)) {
    throw new BadRequestException('fileName is required');
  }

  if (!isNonEmptyString(payload.relativePath)) {
    throw new BadRequestException('relativePath is required');
  }

  if (!isNonEmptyString(payload.sourceMap)) {
    throw new BadRequestException('sourceMap is required');
  }

  return {
    ...payload,
    projectId: payload.projectId.trim(),
    release: payload.release.trim(),
    fileName: payload.fileName.trim(),
    relativePath: payload.relativePath.trim().replaceAll('\\', '/'),
    sourceMap: payload.sourceMap,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
