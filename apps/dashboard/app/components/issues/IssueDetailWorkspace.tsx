'use client';

import { useEffect, useMemo, useState } from 'react';
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
  issueId,
  issue,
  renderedAt,
}: {
  issueId: string;
  issue: IssueDetail;
  renderedAt: string;
}) {
  const [workflow, setWorkflow] = useState<{
    status: IssueWorkflowStatus;
    isRegression: boolean;
  }>({
    status: 'unresolved',
    isRegression: false,
  });
  const [manualSeverity, setManualSeverity] = useState(
    deriveIssueSeverity({
      totalEvents: issue.totalEvents,
      lastSeenAt: issue.issue.lastSeenAt,
    }, new Date(renderedAt).getTime()),
  );
  const renderNowMs = useMemo(() => new Date(renderedAt).getTime(), [renderedAt]);

  useEffect(() => {
    setWorkflow(getIssueWorkflowState(issueId, issue.issue.lastSeenAt));
  }, [issueId, issue.issue.lastSeenAt]);

  const culprit = extractCulprit(issue.stackTrace, issue.issue.clusterKey);
  const frequencyData = useMemo(
    () => buildFrequencySeries(issue.frequencySeries, issue.issue, issue.totalEvents),
    [issue],
  );
  const userRows = useMemo(() => buildSyntheticUsers(issue), [issue]);
  const recentEvents = useMemo(() => buildRecentEventSnapshots(issue), [issue]);
  const timeline = useMemo(() => buildContextTimeline(issue), [issue]);
  const stack = useMemo(() => splitStackFrames(issue.stackTrace), [issue.stackTrace]);

  function updateStatus(nextStatus: IssueWorkflowStatus) {
    persistIssueWorkflowState(issueId, nextStatus);
    setWorkflow({
      status: nextStatus,
      isRegression: false,
    });
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
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground">
              {issue.issue.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{issue.issue.summary}</p>
            <p className="font-mono text-xs text-muted-foreground">{culprit}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <Button
            onClick={() =>
              updateStatus(workflow.status === 'resolved' ? 'unresolved' : 'resolved')
            }
            variant="secondary"
          >
            {workflow.status === 'resolved' ? 'Unresolve' : 'Resolve'}
          </Button>
          <Button onClick={() => updateStatus('ignored')} variant="ghost">
            Ignore
          </Button>
          <select
            className="h-11 rounded-xl border border-border bg-panel px-3 text-sm text-foreground outline-none"
            onChange={(event) => setManualSeverity(event.target.value as typeof manualSeverity)}
            value={manualSeverity}
          >
            <option value="high">High severity</option>
            <option value="medium">Medium severity</option>
            <option value="low">Low severity</option>
          </select>
          <StatusBadge isRegression={workflow.isRegression} status={workflow.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FlatStat label="Events" value={issue.totalEvents.toString()} />
        <FlatStat label="Users affected" value={issue.affectedUsers.toString()} />
        <FlatStat label="First seen" value={formatRelativeTime(issue.issue.firstSeenAt, renderNowMs)} />
        <FlatStat label="Last seen" value={formatRelativeTime(issue.issue.lastSeenAt, renderNowMs)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Stack trace viewer
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  Source-mapped frames
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="warning">{issue.issue.platforms[0] ?? 'browser'}</Badge>
                <Badge variant="info">{issue.issue.environments[0] ?? 'production'}</Badge>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-[#111]">
              <div className="border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
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
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Frequency
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Occurrence density</h3>
            </div>
            <div style={{ width: '100%', minWidth: 0, minHeight: 300 }}>
              <ClientChart height={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      minTickGap={24}
                      stroke="rgba(161,161,170,0.75)"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="rgba(161,161,170,0.75)" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [
                        `${value} occurrence${Number(value) === 1 ? '' : 's'}`,
                        'Count',
                      ]}
                      labelFormatter={(label) => `Occurred: ${label}`}
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
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Recent events
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
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
                      <p className="truncate font-mono text-xs text-foreground/85">{event.eventId}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatRelativeTime(event.occurredAt, renderNowMs)}</p>
                    </div>
                    <ChevronsRight className="size-4 text-muted-foreground" />
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
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Context
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">Metadata surface</h3>
              </div>
              <div className="grid gap-3">
                <MetaRow
                  icon={<FolderKanban className="size-4" />}
                  label="Project"
                  mono
                  value={abbreviateMetaValue(issue.issue.projectId)}
                  valueTitle={issue.issue.projectId}
                />
                <MetaRow
                  icon={<GitBranch className="size-4" />}
                  label="Cluster"
                  mono
                  value={abbreviateMetaValue(issue.issue.clusterKey)}
                  valueTitle={issue.issue.clusterKey}
                />
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

          <AIAnalysisPanel issueId={issueId} projectId={issue.issue.projectId} />

          <Card className="p-5">
            <div className="mb-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Affected users
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Current impact</h3>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-panel-strong/80 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">User ID</th>
                    <th className="px-3 py-3">First Seen</th>
                    <th className="px-3 py-3">Last Seen</th>
                    <th className="px-3 py-3">Occurrences</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-panel-strong/45 text-foreground/88">
                  {userRows.map((row) => (
                    <tr key={row.userId}>
                      <td className="px-3 py-3 font-mono text-xs">{row.userId}</td>
                      <td className="px-3 py-3">{formatRelativeTime(row.firstSeen, renderNowMs)}</td>
                      <td className="px-3 py-3">{formatRelativeTime(row.lastSeen, renderNowMs)}</td>
                      <td className="px-3 py-3">{row.occurrences}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Breadcrumbs
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Context timeline</h3>
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
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-sm leading-6 text-foreground/88">{item.detail}</p>
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
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </Card>
  );
}

function MetaRow({
  icon,
  label,
  value,
  valueTitle,
  mono = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueTitle?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-panel-strong/55 px-3 py-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p
          className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-6 text-foreground/88 ${
            mono ? 'font-mono text-[13px]' : ''
          }`}
          title={valueTitle ?? value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function abbreviateMetaValue(value: string, edgeLength = 10) {
  if (value.length <= edgeLength * 2 + 3) {
    return value;
  }

  return `${value.slice(0, edgeLength)}...${value.slice(-edgeLength)}`;
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
