import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GroupingCandidateEvent } from '@bugsense/types';
import { getAlertRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class IssuesQueryService {
  private readonly logger = new Logger(IssuesQueryService.name);
  private readonly config = getAlertRuntimeConfig();

  async fetchGroupingCandidates(): Promise<GroupingCandidateEvent[]> {
    const query = `
      SELECT
        event_id,
        project_id,
        issue_fingerprint,
        message,
        exception_type,
        stack_trace,
        request_url,
        metadata_json,
        environment,
        platform,
        toString(received_at) AS received_at_text
      FROM ${this.config.clickhouseDb}.error_events
      WHERE received_at >= toStartOfDay(now())
      ORDER BY received_at DESC
      LIMIT 500
      FORMAT JSONEachRow
    `.trim();

    const raw = await this.fetchGroupingRows(query);
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, string | null>)
      .map((row) => ({
        eventId: String(row.event_id),
        projectId: String(row.project_id),
        issueFingerprint: String(row.issue_fingerprint),
        message: String(row.message),
        exceptionType: row.exception_type ? String(row.exception_type) : null,
        stackTrace: String(row.stack_trace ?? ''),
        requestUrl: row.request_url ? String(row.request_url) : null,
        metadataJson: String(row.metadata_json ?? '{}'),
        environment: String(row.environment),
        platform: String(row.platform),
        receivedAt: new Date(String(row.received_at_text)).toISOString(),
      }));
  }

  private async fetchGroupingRows(query: string) {
    let lastError: unknown = null;

    for (
      let attempt = 0;
      attempt <= this.config.clickhouseMaxRetries;
      attempt += 1
    ) {
      try {
        const response = await fetch(
          `${this.config.clickhouseUrl}/?query=${encodeURIComponent(query)}`,
          {
            method: 'POST',
            headers: this.buildHeaders(),
            signal: AbortSignal.timeout(this.config.clickhouseRequestTimeoutMs),
          },
        );

        if (!response.ok) {
          const message = (await response.text()).trim();
          const normalizedMessage =
            message || `HTTP ${response.status} ${response.statusText}`;

          if (
            attempt < this.config.clickhouseMaxRetries &&
            this.isRetryableStatus(response.status)
          ) {
            lastError = new Error(normalizedMessage);
            await this.delay(300 * (attempt + 1));
            continue;
          }

          this.logger.error(
            `ClickHouse grouping query failed: ${normalizedMessage}`,
          );
          throw new InternalServerErrorException(
            `ClickHouse grouping query failed: ${normalizedMessage}`,
          );
        }

        return await response.text();
      } catch (error) {
        lastError = error;

        if (
          attempt < this.config.clickhouseMaxRetries &&
          this.isRetryableError(error)
        ) {
          await this.delay(300 * (attempt + 1));
          continue;
        }

        const message = this.describeError(error);
        this.logger.error(`ClickHouse grouping query failed: ${message}`);
        throw new ServiceUnavailableException(
          `ClickHouse grouping query failed: ${message}`,
        );
      }
    }

    const message = this.describeError(lastError);
    this.logger.error(`ClickHouse grouping query failed: ${message}`);
    throw new ServiceUnavailableException(
      `ClickHouse grouping query failed: ${message}`,
    );
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };

    if (this.config.clickhouseUser) {
      headers['X-ClickHouse-User'] = this.config.clickhouseUser;
    }

    if (this.config.clickhousePassword) {
      headers['X-ClickHouse-Key'] = this.config.clickhousePassword;
    }

    return headers;
  }

  private isRetryableStatus(status: number) {
    return status === 429 || status >= 500;
  }

  private isRetryableError(error: unknown) {
    const message = this.describeError(error).toLowerCase();

    return (
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('econnrefused') ||
      message.includes('timeout') ||
      message.includes('fetch failed') ||
      message.includes('socket')
    );
  }

  private describeError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
