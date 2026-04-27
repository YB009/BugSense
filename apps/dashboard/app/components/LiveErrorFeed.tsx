'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { feedItemMotion, listStagger } from '../../lib/motion';
import { Badge } from './ui/Badge';
import { LivePill } from './ui/LivePill';
import { Skeleton } from './ui/Skeleton';

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
  const reducedMotion = useReducedMotion();

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
    <section className="feed-card bg-transparent p-6">
      <div className="feed-header">
        <div>
          <p className="eyebrow">Live stream</p>
          <h3 className="feed-title">Live errors</h3>
          <p className="muted">
            {events.length > 0
              ? `${events.length} event(s) since midnight.`
              : 'Waiting for your next runtime signal.'}
          </p>
        </div>
        <LivePill status={status} />
      </div>
      {events.length === 0 && status === 'connecting' ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="rounded-2xl border border-border bg-panel-strong/70 p-4" key={index}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-full" />
              </div>
              <Skeleton className="mb-2 h-5 w-4/5 rounded-xl" />
              <Skeleton className="mb-2 h-4 w-2/5 rounded-xl" />
              <Skeleton className="h-4 w-40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="muted">
          Trigger an ingest event and it will appear here in real time without leaving the dashboard.
        </p>
      ) : (
        <motion.div
          animate="animate"
          className="feed-list"
          initial={false}
          variants={listStagger}
        >
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.article
                key={event.eventId}
                layout={!reducedMotion}
                className="feed-item"
                {...feedItemMotion}
              >
                <div className="feed-item-top">
                  <div className="flex items-center gap-3">
                    <span className={`feed-level feed-level-${event.level}`}>
                      {event.level}
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      {formatTime(event.receivedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{event.platform}</Badge>
                    <Badge variant="neutral">{event.environment}</Badge>
                  </div>
                </div>
                <p className="feed-message">{event.message}</p>
                <p className="feed-detail">
                  {event.exceptionType ?? 'UnknownError'} - {event.projectId}
                </p>
                <p className="feed-timestamp">
                  {new Date(event.receivedAt).toLocaleString()}
                </p>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
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
