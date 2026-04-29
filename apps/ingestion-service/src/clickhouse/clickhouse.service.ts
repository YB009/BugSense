import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EnrichedErrorEvent } from '@bugsense/types';
import { Agent as HttpAgent, request as httpRequest } from 'http';
import { Agent as HttpsAgent, request as httpsRequest } from 'https';
import { getIngestionRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class ClickHouseService {
  private readonly logger = new Logger(ClickHouseService.name);
  private readonly config = getIngestionRuntimeConfig();
  private readonly httpAgent = new HttpAgent({
    keepAlive: true,
    maxSockets: 20,
  });
  private readonly httpsAgent = new HttpsAgent({
    keepAlive: true,
    maxSockets: 20,
  });

  async insertErrorEvent(event: EnrichedErrorEvent) {
    const query = `INSERT INTO ${this.config.clickhouseDb}.error_events FORMAT JSONEachRow`;
    const url = new URL(this.config.clickhouseUrl);
    url.searchParams.set('query', query);

    const payload = `${JSON.stringify(this.toClickHouseRow(event))}\n`;
    const response = await this.sendRequestWithRetry(url, payload);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      this.logger.error(`ClickHouse insert failed: ${response.body}`);
      throw new InternalServerErrorException(
        `ClickHouse insert failed: ${response.body}`,
      );
    }
  }

  private async sendRequestWithRetry(url: URL, payload: string) {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.config.clickhouseMaxRetries) {
      attempt += 1;

      try {
        return await this.sendRequest(url, payload);
      } catch (error) {
        lastError = error;

        if (!isRetryableClickHouseError(error) || attempt >= this.config.clickhouseMaxRetries) {
          throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Retrying ClickHouse insert after transient failure (${attempt}/${this.config.clickhouseMaxRetries}): ${message}`,
        );
        await delay(attempt * 500);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
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
    const agent = url.protocol === 'https:' ? this.httpsAgent : this.httpAgent;
    const headers = {
      ...this.buildHeaders(),
      'Content-Length': Buffer.byteLength(payload).toString(),
    };

    return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = requestImpl(
        url,
        {
          method: 'POST',
          agent,
          headers,
          timeout: this.config.clickhouseRequestTimeoutMs,
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
        req.destroy(
          new Error(
            `ClickHouse request timed out after ${this.config.clickhouseRequestTimeoutMs}ms`,
          ),
        );
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

function isRetryableClickHouseError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const networkError = error as Error & { code?: string };
  return (
    networkError.code === 'ECONNRESET' ||
    networkError.code === 'ETIMEDOUT' ||
    networkError.code === 'ECONNREFUSED' ||
    error.message.includes('timed out') ||
    error.message.includes('secure TLS connection was established')
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toClickHouseDateTime64(value: string) {
  return new Date(value).toISOString().replace('T', ' ').replace('Z', '');
}
