import { Injectable } from '@nestjs/common';
import { Observable, Subject, concat, from } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { LiveErrorEvent } from '@bugsense/types';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';

const LIVE_FEED_LIMIT = 20;
const RECENT_ERROR_LIMIT = 500;

@Injectable()
export class SseService {
  private readonly config = getApiGatewayRuntimeConfig();
  private readonly feed = new Subject<LiveErrorEvent>();
  private readonly recentEvents: LiveErrorEvent[] = [];

  publishError(event: LiveErrorEvent) {
    this.recentEvents.unshift(event);
    this.recentEvents.splice(LIVE_FEED_LIMIT);
    this.feed.next(event);
  }

  createErrorStream(): Observable<MessageEvent> {
    const bootstrap = this.recentEvents
      .slice()
      .reverse()
      .map((event) => ({
        type: 'error-event',
        data: event,
      }));

    return concat(
      from(bootstrap),
      this.feed.asObservable().pipe((source) =>
        new Observable<MessageEvent>((subscriber) =>
          source.subscribe({
            next: (event) =>
              subscriber.next({
                type: 'error-event',
                data: event,
              }),
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete(),
          }),
        ),
      ),
    );
  }

  async getRecentErrors(): Promise<LiveErrorEvent[]> {
    const query = `
      SELECT
        event_id,
        project_id,
        message,
        level,
        platform,
        environment,
        exception_type,
        toString(received_at) AS received_at_text
      FROM ${this.config.clickhouseDb}.error_events
      WHERE received_at >= toStartOfDay(now())
      ORDER BY received_at DESC
      LIMIT ${RECENT_ERROR_LIMIT}
      FORMAT JSONEachRow
    `.trim();

    const response = await fetch(
      `${this.config.clickhouseUrl}/?query=${encodeURIComponent(query)}`,
      {
        method: 'POST',
        headers: this.buildClickHouseHeaders(),
      },
    );

    if (!response.ok) {
      return [];
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
        message: String(row.message),
        level: normalizeLevel(String(row.level)),
        platform: String(row.platform),
        environment: String(row.environment),
        exceptionType: row.exception_type ? String(row.exception_type) : null,
        receivedAt: new Date(String(row.received_at_text)).toISOString(),
      }));
  }

  private buildClickHouseHeaders() {
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

function normalizeLevel(level: string): LiveErrorEvent['level'] {
  return level === 'warning' || level === 'info' ? level : 'error';
}
