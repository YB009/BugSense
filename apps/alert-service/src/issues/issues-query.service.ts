import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GroupingCandidateEvent } from '@bugsense/types';
import { getAlertRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class IssuesQueryService {
  private readonly logger = new Logger(IssuesQueryService.name);
  private readonly config = getAlertRuntimeConfig();

  async fetchGroupingCandidates(lastHours = 24): Promise<GroupingCandidateEvent[]> {
    const query = `
      SELECT
        event_id,
        project_id,
        issue_fingerprint,
        message,
        exception_type,
        stack_trace,
        environment,
        platform,
        toString(received_at) AS received_at
      FROM ${this.config.clickhouseDb}.error_events
      WHERE received_at >= now() - toIntervalHour(${lastHours})
      ORDER BY received_at DESC
      LIMIT 500
      FORMAT JSONEachRow
    `.trim();

    const response = await fetch(
      `${this.config.clickhouseUrl}/?query=${encodeURIComponent(query)}`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      this.logger.error(`ClickHouse grouping query failed: ${message}`);
      throw new InternalServerErrorException(
        `ClickHouse grouping query failed: ${message}`,
      );
    }

    const raw = await response.text();
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
        environment: String(row.environment),
        platform: String(row.platform),
        receivedAt: new Date(String(row.received_at)).toISOString(),
      }));
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
}
