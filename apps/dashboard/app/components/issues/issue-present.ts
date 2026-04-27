import type { IssueDetail, IssueListItem } from '../../../lib/issues';

export type IssueSeverity = 'high' | 'medium' | 'low';

export function deriveIssueSeverity(issue: Pick<IssueListItem, 'totalEvents' | 'lastSeenAt'>) {
  const ageHours = Math.max(
    0,
    (Date.now() - new Date(issue.lastSeenAt).getTime()) / (1000 * 60 * 60),
  );

  if (issue.totalEvents >= 30 || (issue.totalEvents >= 12 && ageHours <= 24)) {
    return 'high' as const;
  }

  if (issue.totalEvents >= 10 || ageHours <= 72) {
    return 'medium' as const;
  }

  return 'low' as const;
}

export function severityClasses(severity: IssueSeverity) {
  if (severity === 'high') {
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  }

  if (severity === 'medium') {
    return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
  }

  return 'text-sky-300 bg-sky-400/10 border-sky-400/20';
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `${minutes}m ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.round(diffMs / hour));
    return `${hours}h ago`;
  }

  const days = Math.max(1, Math.round(diffMs / day));
  return `${days}d ago`;
}

export function estimateAffectedUsers(issue: Pick<IssueListItem, 'totalEvents' | 'eventIds'>) {
  return Math.max(1, Math.min(issue.eventIds.length, Math.ceil(issue.totalEvents / 3)));
}

export function extractCulprit(stackTrace: string, fallback: string) {
  const lines = stackTrace
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const preferred =
    lines.find((line) => !/node_modules|<anonymous>|internal\//i.test(line)) ??
    lines[0];

  if (!preferred) {
    return fallback;
  }

  return preferred
    .replace(/^at\s+/, '')
    .trim();
}

export function buildFrequencySeries(issue: Pick<IssueDetail['issue'], 'firstSeenAt' | 'lastSeenAt'>, totalEvents: number) {
  const first = new Date(issue.firstSeenAt).getTime();
  const last = new Date(issue.lastSeenAt).getTime();
  const start = Number.isFinite(first) ? first : Date.now() - 6 * 60 * 60 * 1000;
  const end = Number.isFinite(last) ? last : Date.now();
  const range = Math.max(end - start, 1);
  const buckets = 8;
  const base = Math.max(1, Math.floor(totalEvents / buckets));
  let remainder = Math.max(0, totalEvents - base * buckets);

  return Array.from({ length: buckets }, (_, index) => {
    const time = new Date(start + (range / (buckets - 1 || 1)) * index);
    const bonus = remainder > 0 ? 1 : 0;
    remainder = Math.max(0, remainder - 1);

    return {
      label: `${String(time.getHours()).padStart(2, '0')}:00`,
      value: base + bonus + (index === buckets - 1 ? Math.ceil(totalEvents * 0.08) : 0),
    };
  });
}

export function buildSyntheticUsers(issue: IssueDetail) {
  const rows = Array.from({ length: Math.max(1, Math.min(issue.affectedUsers, 6)) }, (_, index) => {
    const suffix = issue.issue.issueId.slice(-6 + index, issue.issue.issueId.length - index).slice(0, 6);
    const firstSeen = shiftTimestamp(issue.issue.firstSeenAt, index * 36);
    const lastSeen = shiftTimestamp(issue.issue.lastSeenAt, index * 12);
    const occurrences = Math.max(1, Math.ceil(issue.totalEvents / (index + 2)));

    return {
      userId: `user_${suffix || String(index + 1).padStart(2, '0')}`,
      firstSeen,
      lastSeen,
      occurrences,
    };
  });

  return rows;
}

export function buildRecentEventSnapshots(issue: IssueDetail) {
  const total = Math.min(20, issue.issue.eventIds.length);
  const culprit = extractCulprit(issue.stackTrace, issue.issue.clusterKey);

  return issue.issue.eventIds.slice(0, total).map((eventId, index) => {
    const occurredAt = shiftTimestamp(issue.issue.lastSeenAt, index * 9);
    const payload = {
      eventId,
      projectId: issue.issue.projectId,
      issueId: issue.issue.issueId,
      level: 'error',
      message: issue.issue.sampleMessage || issue.issue.title,
      environment: issue.issue.environments[0] ?? 'production',
      platform: issue.issue.platforms[0] ?? 'browser',
      culprit,
      fingerprints: issue.issue.fingerprints,
      tags: {
        clusterKey: issue.issue.clusterKey,
      },
      metadata: {
        groupedAt: issue.issue.updatedAt,
      },
    };

    return {
      eventId,
      occurredAt,
      payload,
    };
  });
}

export function buildContextTimeline(issue: IssueDetail) {
  const culprit = extractCulprit(issue.stackTrace, issue.issue.clusterKey);
  return [
    {
      label: 'Runtime',
      detail: `${issue.issue.platforms[0] ?? 'browser'} in ${issue.issue.environments[0] ?? 'production'}`,
    },
    {
      label: 'Cluster input',
      detail: issue.issue.sampleMessage || issue.issue.summary,
    },
    {
      label: 'Culprit frame',
      detail: culprit,
    },
  ];
}

export function splitStackFrames(stackTrace: string) {
  const frames = stackTrace
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      line,
      isLibrary: /node_modules|internal\//i.test(line),
    }));

  const culpritIndex = frames.findIndex((frame) => !frame.isLibrary);

  return {
    culpritIndex: culpritIndex >= 0 ? culpritIndex : 0,
    frames,
  };
}

function shiftTimestamp(value: string, minutesBack: number) {
  return new Date(new Date(value).getTime() - minutesBack * 60 * 1000).toISOString();
}
