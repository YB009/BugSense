import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EnrichedErrorEvent } from '@bugsense/types';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { getIngestionRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class ClickHouseService {
  private readonly logger = new Logger(ClickHouseService.name);
  private readonly config = getIngestionRuntimeConfig();

  async insertErrorEvent(event: EnrichedErrorEvent) {
    const query = `INSERT INTO ${this.config.clickhouseDb}.error_events FORMAT JSONEachRow`;
    const url = new URL(this.config.clickhouseUrl);
    url.searchParams.set('query', query);

    const payload = `${JSON.stringify(this.toClickHouseRow(event))}\n`;
    const response = await this.sendRequest(url, payload);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      this.logger.error(`ClickHouse insert failed: ${response.body}`);
      throw new InternalServerErrorException(
        `ClickHouse insert failed: ${response.body}`,
      );
    }
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.clickhouseUser) {
      const auth = Buffer.from(
        `${this.config.clickhouseUser}:${this.config.clickhousePassword ?? ''}`,
      ).toString('base64');
      headers.Authorization = `Basic ${auth}`;
    }

    return headers;
  }

  private sendRequest(url: URL, payload: string) {
    const requestImpl = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const headers = {
      ...this.buildHeaders(),
      'Content-Length': Buffer.byteLength(payload).toString(),
    };

    return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = requestImpl(
        url,
        {
          method: 'POST',
          headers,
          timeout: 10000,
        },
        (res) => {
          let body = '';

          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode ?? 500,
              body,
            });
          });
        },
      );

      req.on('timeout', () => {
        req.destroy(new Error('ClickHouse request timed out'));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
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
