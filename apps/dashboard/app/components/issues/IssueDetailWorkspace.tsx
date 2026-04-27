'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronsRight,
  CircleDot,
  FolderKanban,
  GitBranch,
  UserRound,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IssueDetail } from '../../../lib/issues';
import { Button } from '../ui/Button';
import { ClientChart } from '../ui/ClientChart';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import {
  buildContextTimeline,
  buildFrequencySeries,
  buildRecentEventSnapshots,
  buildSyntheticUsers,
  deriveIssueSeverity,
  extractCulprit,
  formatRelativeTime,
  splitStackFrames,
} from './issue-present';
import {
  getIssueWorkflowState,
  persistIssueWorkflowState,
  type IssueWorkflowStatus,
} from './issue-state';
import { StatusBadge } from './IssueListItem';

export function IssueDetailWorkspace({
  apiUrl,
  issueId,
  issue,
  token,
}: {
  apiUrl: string;
  issueId: string;
  issue: IssueDetail;
  token: string;
}) {
  const [workflowStatus, setWorkflowStatus] = useState<IssueWorkflowStatus>(
    getIssueWorkflowState(issueId, issue.issue.lastSeenAt).status,
  );
  const [assignee, setAssignee] = useState('Unassigned');
  const [manualSeverity, setManualSeverity] = useState(
    deriveIssueSeverity({
      totalEvents: issue.totalEvents,
      lastSeenAt: issue.issue.lastSeenAt,
    }),
  );

  const workflow = getIssueWorkflowState(issueId, issue.issue.lastSeenAt);
  const culprit = extractCulprit(issue.stackTrace, issue.issue.clusterKey);
  const frequencyData = useMemo(
    () => buildFrequencySeries(issue.issue, issue.totalEvents),
    [issue],
  );
  const userRows = useMemo(() => buildSyntheticUsers(issue), [issue]);
  const recentEvents = useMemo(() => buildRecentEventSnapshots(issue), [issue]);
  const timeline = useMemo(() => buildContextTimeline(issue), [issue]);
  const stack = useMemo(() => splitStackFrames(issue.stackTrace), [issue.stackTrace]);

  function updateStatus(nextStatus: IssueWorkflowStatus) {
    persistIssueWorkflowState(issueId, nextStatus);
    setWorkflowStatus(nextStatus);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Issue detail</Badge>
            <Badge variant="warning">{issue.issue.projectId}</Badge>
            <Badge variant="error">{manualSeverity}</Badge>
            {workflow.isRegression ? <Badge variant="warning">Regression</Badge> : null}
          </div>
          <div className="space-y-2">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-50">
              {issue.issue.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-zinc-400">{issue.issue.summary}</p>
            <p className="font-mono text-xs text-zinc-500">{culprit}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <Button onClick={() => updateStatus('resolved')} variant="secondary">
            Resolve
          </Button>
          <Button onClick={() => updateStatus('ignored')} variant="ghost">
            Ignore
          </Button>
          <select
            className="h-11 rounded-xl border border-border bg-panel px-3 text-sm text-zinc-100 outline-none"
            onChange={(event) => setManualSeverity(event.target.value as typeof manualSeverity)}
            value={manualSeverity}
          >
            <option value="high">High severity</option>
            <option value="medium">Medium severity</option>
            <option value="low">Low severity</option>
          </select>
          <select
            className="h-11 rounded-xl border border-border bg-panel px-3 text-sm text-zinc-100 outline-none"
            onChange={(event) => setAssignee(event.target.value)}
            value={assignee}
          >
            <option>Unassigned</option>
            <option>Platform team</option>
            <option>Frontend team</option>
            <option>Backend team</option>
          </select>
          <StatusBadge isRegression={workflow.isRegression} status={workflowStatus} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FlatStat label="Events" value={issue.totalEvents.toString()} />
        <FlatStat label="Users affected" value={issue.affectedUsers.toString()} />
        <FlatStat label="First seen" value={formatRelativeTime(issue.issue.firstSeenAt)} />
        <FlatStat label="Last seen" value={formatRelativeTime(issue.issue.lastSeenAt)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Stack trace viewer
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-100">
                  Source-mapped frames
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="warning">{issue.issue.platforms[0] ?? 'browser'}</Badge>
                <Badge variant="info">{issue.issue.environments[0] ?? 'production'}</Badge>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-[#111]">
              <div className="border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Culprit: {culprit}
              </div>
              <div className="max-h-[28rem] overflow-auto p-3">
                <div className="space-y-2 font-mono text-xs text-zinc-300">
                  {stack.frames.map((frame, index) =>
                    frame.isLibrary ? (
                      <details
                        className="rounded-xl border border-border/70 bg-zinc-950/55 px-3 py-2"
                        key={`${frame.line}-${index}`}
                      >
                        <summary className="cursor-pointer list-none text-zinc-500">
                          <span className="inline-flex items-center gap-2">
                            <ChevronDown className="size-3" />
                            Library frame
                          </span>
                        </summary>
                        <div className="pt-2 text-zinc-400">{frame.line}</div>
                      </details>
                    ) : (
                      <div
                        className={`rounded-xl border px-3 py-2 ${
                          index === stack.culpritIndex
                            ? 'border-red-400/25 bg-red-400/8 text-zinc-100'
                            : 'border-border/70 bg-zinc-950/45'
                        }`}
                        key={`${frame.line}-${index}`}
                      >
                        {frame.line}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Frequency
              </p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-100">Occurrence density</h3>
            </div>
            <div style={{ width: '100%', minWidth: 0, minHeight: 300 }}>
              <ClientChart height={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(161,161,170,0.75)" tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(161,161,170,0.75)" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#111114',
                        border: '1px solid rgba(39,39,42,1)',
                        borderRadius: '16px',
                        color: '#fafafa',
                      }}
                    />
                    <Bar dataKey="value" fill="#EF4444" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ClientChart>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Recent events
              </p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-100">
                Last {recentEvents.length} matched event snapshots
              </h3>
            </div>
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <details
                  className="rounded-2xl border border-border bg-panel-strong/60 p-4"
                  key={event.eventId}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-zinc-200">{event.eventId}</p>
                      <p className="mt-1 text-sm text-zinc-500">{formatRelativeTime(event.occurredAt)}</p>
                    </div>
                    <ChevronsRight className="size-4 text-zinc-500" />
                  </summary>
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-[#111] p-4 font-mono text-xs leading-6 text-zinc-300">
                    <code>{JSON.stringify(event.payload, null, 2)}</code>
                  </pre>
                </details>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Context
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-100">Metadata surface</h3>
              </div>
              <div className="grid gap-3">
                <MetaRow icon={<FolderKanban className="size-4" />} label="Project" value={issue.issue.projectId} />
                <MetaRow icon={<GitBranch className="size-4" />} label="Cluster" value={issue.issue.clusterKey} />
                <MetaRow
                  icon={<CircleDot className="size-4" />}
                  label="Environments"
                  value={issue.issue.environments.join(', ') || 'production'}
                />
                <MetaRow
                  icon={<AlertTriangle className="size-4" />}
                  label="Platforms"
                  value={issue.issue.platforms.join(', ') || 'browser'}
                />
              </div>
            </div>
          </Card>

          <AIAnalysisPanel apiUrl={apiUrl} issueId={issueId} token={token} />

          <Card className="p-5">
            <div className="mb-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Affected users
              </p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-100">Current impact</h3>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-zinc-950/70 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-3">User ID</th>
                    <th className="px-3 py-3">First Seen</th>
                    <th className="px-3 py-3">Last Seen</th>
                    <th className="px-3 py-3">Occurrences</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-panel-strong/45 text-zinc-200">
                  {userRows.map((row) => (
                    <tr key={row.userId}>
                      <td className="px-3 py-3 font-mono text-xs">{row.userId}</td>
                      <td className="px-3 py-3">{formatRelativeTime(row.firstSeen)}</td>
                      <td className="px-3 py-3">{formatRelativeTime(row.lastSeen)}</td>
                      <td className="px-3 py-3">{row.occurrences}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Breadcrumbs
              </p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-100">Context timeline</h3>
            </div>
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <div className="relative flex gap-3" key={`${item.label}-${index}`}>
                  <div className="flex flex-col items-center">
                    <div className="mt-1 size-2.5 rounded-full bg-zinc-300" />
                    {index < timeline.length - 1 ? (
                      <div className="mt-2 h-full w-px bg-border" />
                    ) : null}
                  </div>
                  <div className="space-y-1 pb-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      {item.label}
                    </p>
                    <p className="text-sm leading-6 text-zinc-200">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function FlatStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{value}</p>
    </Card>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-panel-strong/55 px-3 py-3">
      <div className="mt-0.5 text-zinc-500">{icon}</div>
      <div className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
        <p className="text-sm leading-6 text-zinc-200">{value}</p>
      </div>
    </div>
  );
}

export function IssueDetailSkeleton() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-28 w-full" key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
        <div className="space-y-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </section>
  );
}
