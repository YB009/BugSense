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

const MAX_EVENTS = 500;
const STORAGE_PREFIX = 'bugsense:live-errors:';

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
    let ignore = false;

    async function loadRecentEvents() {
      const recentEvents = await fetchRecentEvents(apiUrl, token);
      if (ignore) {
        return;
      }

      setEvents((current) =>
        mergeEvents(recentEvents.length > 0 ? recentEvents : readTodayEvents(), current),
      );
    }

    setEvents(readTodayEvents());
    void loadRecentEvents();

    return () => {
      ignore = true;
    };
  }, [apiUrl, token]);

  useEffect(() => {
    writeTodayEvents(events);
  }, [events]);

  useEffect(() => {
    const source = new EventSource(streamUrl);

    source.addEventListener('open', () => {
      setStatus('live');
    });

    source.addEventListener('error-event', (event) => {
      const messageEvent = event as MessageEvent<string>;
      const payload = JSON.parse(messageEvent.data) as LiveErrorEvent;
      setEvents((current) => mergeEvents([payload], current));
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
          {events.length > 0 ? (
            <p className="muted">{events.length} event(s) since midnight.</p>
          ) : null}
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
                  {event.platform} - {event.environment}
                </span>
              </div>
              <p className="feed-message">{event.message}</p>
              <p className="feed-detail">
                {event.exceptionType ?? 'UnknownError'} - {event.projectId}
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

function readTodayEvents() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    clearOldFeedKeys();
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LiveErrorEvent[];
    return parsed.filter(isTodayEvent).slice(0, MAX_EVENTS);
  } catch {
    return [];
  }
}

async function fetchRecentEvents(apiUrl: string, token: string) {
  try {
    const url = new URL('/sse/errors/recent', apiUrl);
    url.searchParams.set('token', token);

    const response = await fetch(url.toString(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { events?: LiveErrorEvent[] };
    return (payload.events ?? []).filter(isTodayEvent).slice(0, MAX_EVENTS);
  } catch {
    return [];
  }
}

function mergeEvents(
  incoming: LiveErrorEvent[],
  current: LiveErrorEvent[],
): LiveErrorEvent[] {
  const eventsById = new Map<string, LiveErrorEvent>();

  for (const event of [...incoming, ...current]) {
    if (isTodayEvent(event)) {
      eventsById.set(event.eventId, event);
    }
  }

  return Array.from(eventsById.values())
    .sort(
      (left, right) =>
        new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
    )
    .slice(0, MAX_EVENTS);
}

function writeTodayEvents(events: LiveErrorEvent[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      storageKey(),
      JSON.stringify(events.filter(isTodayEvent).slice(0, MAX_EVENTS)),
    );
  } catch {
    // Private browsing or quota errors should not break the live stream.
  }
}

function storageKey() {
  return `${STORAGE_PREFIX}${todayKey()}`;
}

function todayKey() {
  return dateKey(new Date());
}

function isTodayEvent(event: LiveErrorEvent) {
  return dateKey(new Date(event.receivedAt)) === todayKey();
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function clearOldFeedKeys() {
  const currentKey = storageKey();

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX) && key !== currentKey) {
      window.localStorage.removeItem(key);
    }
  }
}
