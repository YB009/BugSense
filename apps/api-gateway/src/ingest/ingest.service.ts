import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  IngestEventRequest,
  IngestEventResponse,
  SERVICE_TOKENS,
  TRANSPORT_PATTERNS,
} from '@bugsense/types';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class IngestService {
  constructor(
    @Inject(SERVICE_TOKENS.INGESTION)
    private readonly ingestionClient: ClientProxy,
  ) {}

  async ingest(payload: IngestEventRequest) {
    const validatedPayload = validateIngestEvent(payload);

    return lastValueFrom(
      this.ingestionClient.send<IngestEventResponse>(
        TRANSPORT_PATTERNS.INGEST_EVENT,
        validatedPayload,
      ),
    );
  }
}

function validateIngestEvent(payload: IngestEventRequest): IngestEventRequest {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Request body must be a JSON object');
  }

  if (!isNonEmptyString(payload.projectId)) {
    throw new BadRequestException('projectId is required');
  }

  if (!isNonEmptyString(payload.message)) {
    throw new BadRequestException('message is required');
  }

  if (!isNonEmptyString(payload.platform)) {
    throw new BadRequestException('platform is required');
  }

  const level = payload.level ?? 'error';
  if (!['error', 'warning', 'info'].includes(level)) {
    throw new BadRequestException('level must be error, warning, or info');
  }

  if (payload.occurredAt && Number.isNaN(Date.parse(payload.occurredAt))) {
    throw new BadRequestException('occurredAt must be a valid ISO timestamp');
  }

  return {
    ...payload,
    level,
    environment: payload.environment ?? 'production',
    handled: payload.handled ?? true,
    stackTrace: payload.stackTrace ?? null,
    releaseVersion: payload.releaseVersion ?? null,
    exceptionType: payload.exceptionType ?? null,
    sessionId: payload.sessionId ?? null,
    userId: payload.userId ?? null,
    requestUrl: payload.requestUrl ?? null,
    userAgent: payload.userAgent ?? null,
    browserName: payload.browserName ?? null,
    browserVersion: payload.browserVersion ?? null,
    osName: payload.osName ?? null,
    osVersion: payload.osVersion ?? null,
    tags: payload.tags ?? {},
    contexts: payload.contexts ?? {},
    metadata: payload.metadata ?? {},
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
