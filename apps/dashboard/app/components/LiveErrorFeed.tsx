'use client';

import { useEffect, useMemo, useState } from 'react';

interface LiveErrorEvent {
  eventId: string;
  projectId: string;
  message: string;
  level: 'error' | 'warning' | 'info';
  platform: string;
  environment: string;
  exceptionType: string | null;
  receivedAt: string;
}

interface LiveErrorFeedProps {
  apiUrl: string;
  token: string;
}

export function LiveErrorFeed({ apiUrl, token }: LiveErrorFeedProps) {
  const [events, setEvents] = useState<LiveErrorEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>(
    'connecting',
  );

  const streamUrl = useMemo(() => {
    const url = new URL('/sse/errors', apiUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }, [apiUrl, token]);

  useEffect(() => {
    const source = new EventSource(streamUrl);

    source.addEventListener('open', () => {
      setStatus('live');
    });

    source.addEventListener('error-event', (event) => {
      const messageEvent = event as MessageEvent<string>;
      const payload = JSON.parse(messageEvent.data) as LiveErrorEvent;
      setEvents((current) => [payload, ...current.filter((item) => item.eventId !== payload.eventId)].slice(0, 12));
    });

    source.onerror = () => {
      setStatus('offline');
    };

    return () => {
      source.close();
    };
  }, [streamUrl]);

  return (
    <section className="feed-card">
      <div className="feed-header">
        <div>
          <p className="eyebrow">SSE Feed</p>
          <h3 className="feed-title">Live errors</h3>
        </div>
        <div className={`feed-status feed-status-${status}`}>
          <span className="feed-status-dot" />
          <span>{status}</span>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="muted">
          Waiting for new errors. Trigger an ingest event and it will appear here
          in real time.
        </p>
      ) : (
        <div className="feed-list">
          {events.map((event) => (
            <article className="feed-item" key={event.eventId}>
              <div className="feed-item-top">
                <span className={`feed-level feed-level-${event.level}`}>
                  {event.level}
                </span>
                <span className="feed-meta">
                  {event.platform} · {event.environment}
                </span>
              </div>
              <p className="feed-message">{event.message}</p>
              <p className="feed-detail">
                {event.exceptionType ?? 'UnknownError'} · {event.projectId}
              </p>
              <p className="feed-timestamp">
                {new Date(event.receivedAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
