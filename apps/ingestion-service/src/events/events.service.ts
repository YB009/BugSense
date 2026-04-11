import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AlertEvaluationJob,
  EnrichedErrorEvent,
  IngestEventRequest,
  IngestEventResponse,
  SERVICE_TOKENS,
  TRANSPORT_PATTERNS,
  TransportHealthResponse,
} from '@bugsense/types';
import { ClientProxy } from '@nestjs/microservices';
import { createHash, randomUUID } from 'crypto';
import { lastValueFrom } from 'rxjs';
import { AlertQueueService } from '../bull/alert-queue.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(SERVICE_TOKENS.ALERT)
    private readonly alertClient: ClientProxy,
    private readonly clickHouseService: ClickHouseService,
    private readonly alertQueueService: AlertQueueService,
  ) {}

  getHealth() {
    return {
      service: 'ingestion-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getTransportHealth() {
    const alertHealth = await lastValueFrom(
      this.alertClient.send<TransportHealthResponse>(
        TRANSPORT_PATTERNS.ALERT_HEALTH,
        {},
      ),
    );

    return {
      ...this.getHealth(),
      dependencies: [alertHealth],
    };
  }

  async ingestEvent(payload: IngestEventRequest): Promise<IngestEventResponse> {
    const event = enrichEvent(payload);
    await this.clickHouseService.insertErrorEvent(event);

    try {
      await this.alertQueueService.enqueueAlertEvaluation(toAlertEvaluationJob(event));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue alert evaluation for event ${event.eventId}: ${message}`,
      );
    }

    return {
      eventId: event.eventId,
      projectId: event.projectId,
      status: 'accepted',
      receivedAt: event.receivedAt,
    };
  }
}

function enrichEvent(payload: IngestEventRequest): EnrichedErrorEvent {
  const receivedAt = new Date().toISOString();
  const occurredAt = payload.occurredAt ?? receivedAt;
  const issueFingerprint = createHash('sha256')
    .update(
      [payload.projectId, payload.message, payload.exceptionType ?? '', payload.stackTrace ?? ''].join(
        '|',
      ),
    )
    .digest('hex');

  return {
    eventId: randomUUID(),
    projectId: payload.projectId,
    issueFingerprint,
    environment: payload.environment ?? 'production',
    releaseVersion: payload.releaseVersion ?? null,
    level: payload.level ?? 'error',
    platform: payload.platform,
    message: payload.message,
    exceptionType: payload.exceptionType ?? null,
    stackTrace: payload.stackTrace ?? '',
    handled: payload.handled === false ? 0 : 1,
    sessionId: payload.sessionId ?? null,
    userId: payload.userId ?? null,
    requestUrl: payload.requestUrl ?? null,
    userAgent: payload.userAgent ?? null,
    browserName: payload.browserName ?? null,
    browserVersion: payload.browserVersion ?? null,
    osName: payload.osName ?? null,
    osVersion: payload.osVersion ?? null,
    tagsJson: JSON.stringify(payload.tags ?? {}),
    contextsJson: JSON.stringify(payload.contexts ?? {}),
    metadataJson: JSON.stringify(payload.metadata ?? {}),
    occurredAt,
    receivedAt,
  };
}

function toAlertEvaluationJob(event: EnrichedErrorEvent): AlertEvaluationJob {
  return {
    eventId: event.eventId,
    projectId: event.projectId,
    issueFingerprint: event.issueFingerprint,
    level: event.level,
    message: event.message,
    environment: event.environment,
    platform: event.platform,
    occurredAt: event.occurredAt,
    receivedAt: event.receivedAt,
  };
}
