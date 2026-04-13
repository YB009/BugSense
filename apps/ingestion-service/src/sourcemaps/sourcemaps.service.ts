import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';
import {
  SourcemapUploadRequest,
  SourcemapUploadResponse,
} from '@bugsense/types';
import { getIngestionRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class SourcemapsService {
  private readonly logger = new Logger(SourcemapsService.name);

  async uploadSourcemap(
    payload: SourcemapUploadRequest,
  ): Promise<SourcemapUploadResponse> {
    const normalizedPayload = validateSourcemapUpload(payload);
    const config = getIngestionRuntimeConfig();
    const storageRoot = resolve(config.sourcemapStorageDir);
    const safeRelativePath = normalizeRelativePath(normalizedPayload.relativePath);
    const releaseDirectory = join(
      storageRoot,
      sanitizePathSegment(normalizedPayload.projectId),
      sanitizePathSegment(normalizedPayload.release),
    );
    const storageFilePath = join(releaseDirectory, safeRelativePath);
    const metadataFilePath = `${storageFilePath}.metadata.json`;
    const checksum = createHash('sha256')
      .update(normalizedPayload.sourceMap)
      .digest('hex');
    const storedAt = new Date().toISOString();

    await mkdir(dirname(storageFilePath), { recursive: true });
    await writeFile(storageFilePath, normalizedPayload.sourceMap, 'utf8');
    await writeFile(
      metadataFilePath,
      JSON.stringify(
        {
          projectId: normalizedPayload.projectId,
          release: normalizedPayload.release,
          fileName: normalizedPayload.fileName,
          relativePath: safeRelativePath,
          checksum,
          size: Buffer.byteLength(normalizedPayload.sourceMap, 'utf8'),
          storedAt,
        },
        null,
        2,
      ),
      'utf8',
    );

    const storagePath = relative(storageRoot, storageFilePath).replaceAll('\\', '/');
    this.logger.log(
      `Stored sourcemap for ${normalizedPayload.projectId}@${normalizedPayload.release} at ${storagePath}`,
    );

    return {
      projectId: normalizedPayload.projectId,
      release: normalizedPayload.release,
      fileName: normalizedPayload.fileName,
      relativePath: safeRelativePath,
      status: 'stored',
      storedAt,
      checksum,
      storagePath,
    };
  }
}

function validateSourcemapUpload(
  payload: SourcemapUploadRequest,
): SourcemapUploadRequest {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Sourcemap payload must be a JSON object');
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

function normalizeRelativePath(value: string) {
  const segments = value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new BadRequestException('relativePath must contain a file path');
  }

  for (const segment of segments) {
    if (segment === '.' || segment === '..' || /[:*?"<>|]/.test(segment)) {
      throw new BadRequestException('relativePath contains invalid path segments');
    }
  }

  return segments.join('/');
}

function sanitizePathSegment(value: string) {
  const sanitized = value.trim().replace(/[\\/:*?"<>|]/g, '-');

  if (!sanitized) {
    throw new BadRequestException('Invalid storage path segment');
  }

  return sanitized;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
