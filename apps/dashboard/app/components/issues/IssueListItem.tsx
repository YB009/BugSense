'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Box, CircleDot, ShieldAlert, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IssueListItem as IssueListItemType } from '../../../lib/issues';
import {
  deriveIssueSeverity,
  estimateAffectedUsers,
  extractCulprit,
  formatRelativeTime,
  severityClasses,
} from './issue-present';
import type { IssueWorkflowStatus } from './issue-state';
import { cn } from '../../../lib/utils';

export function IssueListItem({
  issue,
  status,
  isRegression,
}: {
  issue: IssueListItemType;
  status: IssueWorkflowStatus;
  isRegression: boolean;
}) {
  const severity = deriveIssueSeverity(issue);
  const usersAffected = estimateAffectedUsers(issue);
  const culprit = extractCulprit(issue.sampleStackTrace, issue.clusterKey);

  return (
    <Link href={`/issues/${issue.issueId}`}>
      <motion.article
        whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.55)', y: -1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="group flex flex-col gap-3 rounded-2xl border border-border bg-panel/78 p-4 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold text-zinc-100">
              {issue.title}
            </h3>
            <p className="truncate font-mono text-xs text-zinc-500">{culprit}</p>
          </div>
          <StatusBadge status={status} isRegression={isRegression} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IssueTag
            className={severityClasses(severity)}
            icon={<ShieldAlert className="size-3" />}
            label={severity}
          />
          <IssueTag icon={<Box className="size-3" />} label={issue.projectId} />
          <IssueTag icon={<Tag className="size-3" />} label={issue.fingerprints[0] ?? 'cluster'} />
          <IssueTag icon={<CircleDot className="size-3" />} label={issue.environments[0] ?? 'production'} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          <span>{issue.totalEvents} events</span>
          <span>{usersAffected} users affected</span>
          <span>First seen {formatRelativeTime(issue.firstSeenAt)}</span>
          <span className="text-zinc-300">Last seen {formatRelativeTime(issue.lastSeenAt)}</span>
        </div>
      </motion.article>
    </Link>
  );
}

export function StatusBadge({
  status,
  isRegression,
}: {
  status: IssueWorkflowStatus;
  isRegression?: boolean;
}) {
  if (isRegression) {
    return (
      <span className="rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-orange-400">
        Regression
      </span>
    );
  }

  const className =
    status === 'resolved'
      ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/8'
      : status === 'ignored'
        ? 'text-zinc-400 border-zinc-500/20 bg-zinc-500/8'
        : 'text-red-400 border-red-400/20 bg-red-400/10';

  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em]',
        className,
      )}
    >
      {status}
    </span>
  );
}

function IssueTag({
  label,
  icon,
  className,
}: {
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-strong/75 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-300',
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
