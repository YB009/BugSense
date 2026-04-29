'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { DashboardProject, ProjectErrorEvent } from '../../../lib/projects';
import type { IssueListItem } from '../../../lib/issues';
import { Button, buttonStyles } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { SectionHeader } from '../ui/SectionHeader';
import { Skeleton } from '../ui/Skeleton';
import { ClearTodayIssuesButton } from './ClearTodayIssuesButton';
import { IssueListItem as IssueRow } from './IssueListItem';
import { deriveIssueSeverity } from './issue-present';
import {
  getIssueWorkflowState,
  readIssueWorkflowMap,
  type StoredIssueWorkflowMap,
  type IssueWorkflowStatus,
} from './issue-state';

type StatusFilter = 'all' | IssueWorkflowStatus;
type SeverityFilter = 'all' | ReturnType<typeof deriveIssueSeverity>;
type TimeRange = '24h' | '7d' | '30d';
type SortMode = 'frequent' | 'users' | 'recent';

export function IssuesListWorkspace({
  issues,
  projects,
  recentEvents,
  renderedAt,
  apiUrl,
  token,
}: {
  issues: IssueListItem[];
  projects: DashboardProject[];
  recentEvents: ProjectErrorEvent[];
  renderedAt: string;
  apiUrl: string;
  token: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('7d');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('frequent');
  const [query, setQuery] = useState('');
  const [workflowMap, setWorkflowMap] = useState<StoredIssueWorkflowMap>({});
  const selectedStatus = (searchParams.get('status') as StatusFilter | null) ?? 'all';
  const renderNowMs = useMemo(() => new Date(renderedAt).getTime(), [renderedAt]);

  useEffect(() => {
    setWorkflowMap(readIssueWorkflowMap());

    function handleStorage() {
      setWorkflowMap(readIssueWorkflowMap());
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    setSelectedProject('all');
    setSelectedEnvironment('all');
    setSelectedTimeRange('7d');
    setSelectedSeverity('all');
    setSortMode('frequent');
    setQuery('');
  }, [issues, projects, recentEvents]);

  function setStatusFilter(status: StatusFilter) {
    const params = new URLSearchParams(searchParams.toString());

    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  const environments = useMemo(
    () =>
      Array.from(
        new Set(issues.flatMap((issue) => issue.environments.filter(Boolean))),
      ),
    [issues],
  );

  const filteredIssues = useMemo(() => {
    const maxAgeMs =
      selectedTimeRange === '24h'
        ? 24 * 60 * 60 * 1000
        : selectedTimeRange === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    return issues
      .map((issue) => {
        const workflow = getIssueWorkflowState(
          issue.issueId,
          issue.lastSeenAt,
          workflowMap,
        );
        const severity = deriveIssueSeverity(issue, renderNowMs);
        return {
          issue,
          severity,
          workflow,
        };
      })
      .filter(({ issue, workflow, severity }) => {
        const lastSeenMs = new Date(issue.lastSeenAt).getTime();
        const matchesProject =
          selectedProject === 'all' || issue.projectId === selectedProject;
        const matchesStatus =
          selectedStatus === 'all' || workflow.status === selectedStatus;
        const matchesEnvironment =
          selectedEnvironment === 'all' ||
          issue.environments.includes(selectedEnvironment);
        const matchesSeverity =
          selectedSeverity === 'all' || severity === selectedSeverity;
        const matchesTime = renderNowMs - lastSeenMs <= maxAgeMs;
        const matchesQuery =
          query.trim().length === 0 ||
          `${issue.title} ${issue.summary} ${issue.projectId}`
            .toLowerCase()
            .includes(query.trim().toLowerCase());

        return (
          matchesProject &&
          matchesStatus &&
          matchesEnvironment &&
          matchesSeverity &&
          matchesTime &&
          matchesQuery
        );
      })
      .sort((a, b) => {
        if (sortMode === 'recent') {
          return (
            new Date(b.issue.lastSeenAt).getTime() -
            new Date(a.issue.lastSeenAt).getTime()
          );
        }

        if (sortMode === 'users') {
          return b.issue.eventIds.length - a.issue.eventIds.length;
        }

        return b.issue.totalEvents - a.issue.totalEvents;
      });
  }, [
    issues,
    query,
    selectedEnvironment,
    selectedProject,
    selectedSeverity,
    selectedStatus,
    selectedTimeRange,
    sortMode,
    workflowMap,
    renderNowMs,
  ]);

  const recentProjectIds = useMemo(
    () => Array.from(new Set(recentEvents.map((event) => event.projectId))),
    [recentEvents],
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Issues workspace"
        title="Triage clustered failures without leaving the queue."
        description="Filter by project, status, environment, severity, and time range, then move directly into the detail view when a cluster becomes actionable."
        action={
          <div className="flex flex-wrap items-start justify-end gap-3">
            <ClearTodayIssuesButton apiUrl={apiUrl} token={token} />
            <Link className={buttonStyles({ variant: 'secondary' })} href="/grouping">
              <span className="leading-none text-center">Run grouping</span>
            </Link>
          </div>
        }
      />

      <motion.div
        layout
        className="sticky top-[5.25rem] z-20 rounded-2xl border border-border bg-panel/92 p-4 shadow-panel backdrop-blur"
      >
        <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Project"
              onChange={setSelectedProject}
              options={[
                { label: 'All projects', value: 'all' },
                ...projects.map((project) => ({
                  label: project.name,
                  value: project.id,
                })),
              ]}
              value={selectedProject}
            />
            <FilterSelect
              label="Status"
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              options={[
                { label: 'All statuses', value: 'all' },
                { label: 'Unresolved', value: 'unresolved' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'Ignored', value: 'ignored' },
              ]}
              value={selectedStatus}
            />
            <FilterSelect
              label="Environment"
              onChange={setSelectedEnvironment}
              options={[
                { label: 'All environments', value: 'all' },
                ...environments.map((environment) => ({
                  label: environment,
                  value: environment,
                })),
              ]}
              value={selectedEnvironment}
            />
            <FilterSelect
              label="Time range"
              onChange={(value) => setSelectedTimeRange(value as TimeRange)}
              options={[
                { label: 'Last 24h', value: '24h' },
                { label: 'Last 7d', value: '7d' },
                { label: 'Last 30d', value: '30d' },
              ]}
              value={selectedTimeRange}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[0.8fr_0.9fr_1.3fr_auto]">
            <FilterSelect
              label="Severity"
              onChange={(value) => setSelectedSeverity(value as SeverityFilter)}
              options={[
                { label: 'All severities', value: 'all' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ]}
              value={selectedSeverity}
            />
            <FilterSelect
              label="Sort"
              onChange={(value) => setSortMode(value as SortMode)}
              options={[
                { label: 'Most frequent', value: 'frequent' },
                { label: 'Users affected', value: 'users' },
                { label: 'Last seen', value: 'recent' },
              ]}
              value={sortMode}
            />
            <label className="space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Search
              </span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-panel-strong/70 px-3">
                <Search className="size-4 text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search message, project, cluster"
                  type="search"
                  value={query}
                />
              </div>
            </label>
            <div className="flex items-end">
              <Link
                className={buttonStyles({
                  className: 'w-full sm:w-auto',
                  variant: 'secondary',
                })}
                href="/grouping"
              >
                <span className="leading-none text-center">Run grouping</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {issues.length === 0 ? (
        <EmptyState
          title="No issues exist yet"
          description="Generate grouped clusters from recent events or move into the live event stream to inspect raw failures before grouping."
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonStyles({ variant: 'secondary' })}
                href="/grouping"
              >
                <span className="leading-none text-center">Run grouping now</span>
              </Link>
              <Link className={buttonStyles({ variant: 'ghost' })} href="/dashboard">
                <span className="leading-none text-center">View raw events</span>
              </Link>
            </div>
          }
        />
      ) : filteredIssues.length === 0 ? (
        <EmptyState
          title="No issues match the current filters"
          description={`The current workspace has ${issues.length} grouped issue(s), but none matched the selected filters. Active projects in today's error stream: ${recentProjectIds.join(', ') || 'none'}.`}
        />
      ) : (
        <div className="space-y-3">
          {filteredIssues.map(({ issue, workflow }) => (
            <IssueRow
              isRegression={workflow.isRegression}
              issue={issue}
              key={`${issue.issueId}:${workflowMap[issue.issueId]?.changedAt ?? 'initial'}`}
              nowMs={renderNowMs}
              status={workflow.status}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <select
        className="h-11 w-full rounded-xl border border-border bg-panel-strong/70 px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function IssueListWorkspaceSkeleton() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-80" />
        <Skeleton className="h-5 w-[32rem]" />
      </div>
      <div className="rounded-2xl border border-border bg-panel/92 p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton className="h-11 w-full" key={index} />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="rounded-2xl border border-border bg-panel/78 p-4" key={index}>
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
