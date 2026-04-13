import { Injectable } from '@nestjs/common';
import { Observable, Subject, concat, from } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { LiveErrorEvent } from '@bugsense/types';

const LIVE_FEED_LIMIT = 20;

@Injectable()
export class SseService {
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
}
