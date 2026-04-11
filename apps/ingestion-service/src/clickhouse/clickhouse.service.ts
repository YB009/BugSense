import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EnrichedErrorEvent } from '@bugsense/types';
import { getIngestionRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class ClickHouseService {
  private readonly logger = new Logger(ClickHouseService.name);
  private readonly config = getIngestionRuntimeConfig();

  async insertErrorEvent(event: EnrichedErrorEvent) {
    const query = `INSERT INTO ${this.config.clickhouseDb}.error_events FORMAT JSONEachRow`;
    const response = await fetch(
      `${this.config.clickhouseUrl}/?query=${encodeURIComponent(query)}`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: `${JSON.stringify(this.toClickHouseRow(event))}\n`,
      },
    );

    if (!response.ok) {
      const message = await response.text();
      this.logger.error(`ClickHouse insert failed: ${message}`);
      throw new InternalServerErrorException(
        `ClickHouse insert failed: ${message}`,
      );
    }
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.clickhouseUser) {
      headers['X-ClickHouse-User'] = this.config.clickhouseUser;
    }

    if (this.config.clickhousePassword) {
      headers['X-ClickHouse-Key'] = this.config.clickhousePassword;
    }

    return headers;
  }

  private toClickHouseRow(event: EnrichedErrorEvent) {
    return {
      event_id: event.eventId,
      project_id: event.projectId,
      issue_fingerprint: event.issueFingerprint,
      environment: event.environment,
      release_version: event.releaseVersion,
      level: event.level,
      platform: event.platform,
      message: event.message,
      exception_type: event.exceptionType,
      stack_trace: event.stackTrace,
      handled: event.handled,
      session_id: event.sessionId,
      user_id: event.userId,
      request_url: event.requestUrl,
      user_agent: event.userAgent,
      browser_name: event.browserName,
      browser_version: event.browserVersion,
      os_name: event.osName,
      os_version: event.osVersion,
      tags_json: event.tagsJson,
      contexts_json: event.contextsJson,
      metadata_json: event.metadataJson,
      occurred_at: toClickHouseDateTime64(event.occurredAt),
      received_at: toClickHouseDateTime64(event.receivedAt),
    };
  }
}

function toClickHouseDateTime64(value: string) {
  return new Date(value).toISOString().replace('T', ' ').replace('Z', '');
}
