import { notFound } from 'next/navigation';
import { getDashboardAccessToken, getDashboardApiUrl } from './auth';

export interface IssueListItem {
  issueId: string;
  projectId: string;
  clusterKey: string;
  title: string;
  summary: string;
  eventIds: string[];
  fingerprints: string[];
  sampleMessage: string;
  sampleStackTrace: string;
  environments: string[];
  platforms: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
  totalEvents: number;
}

export interface IssueBreakdownItem {
  label: string;
  count: number;
}

export interface IssueDetail {
  issue: Omit<IssueListItem, 'totalEvents'>;
  totalEvents: number;
  affectedUsers: number;
  browserBreakdown: IssueBreakdownItem[];
  osBreakdown: IssueBreakdownItem[];
  stackTrace: string;
}

export interface IssueAnalysisResult {
  issueId: string;
  model: string;
  provider: 'gemini' | 'heuristic';
  rootCause: string;
  suggestedFix: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface IssueGroupingRunResult {
  status: 'completed';
  groupedCount: number;
  generatedAt: string;
  issues: IssueListItem[];
}

export async function fetchIssues(): Promise<IssueListItem[]> {
  try {
    const token = await getDashboardAccessToken();
    if (!token) {
      return [];
    }

    const response = await fetch(`${getDashboardApiUrl()}/issues`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as
      | { issues?: IssueListItem[]; data?: IssueListItem[] }
      | IssueListItem[];

    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.issues ?? payload.data ?? [];
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    return [];
  }
}

export async function fetchIssueDetail(issueId: string): Promise<IssueDetail> {
  const token = await getDashboardAccessToken();
  if (!token) {
    notFound();
  }

  const response = await fetch(`${getDashboardApiUrl()}/issues/${issueId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load issue ${issueId}`);
  }

  return (await response.json()) as IssueDetail;
}

export async function analyzeIssue(issueId: string): Promise<IssueAnalysisResult> {
  const token = await getDashboardAccessToken();
  if (!token) {
    throw new Error('Missing dashboard token');
  }

  const response = await fetch(`${getDashboardApiUrl()}/issues/${issueId}/analysis`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to analyze issue ${issueId}`);
  }

  return (await response.json()) as IssueAnalysisResult;
}

export async function runIssueGrouping(): Promise<IssueGroupingRunResult> {
  const token = await getDashboardAccessToken();
  if (!token) {
    throw new Error('Missing dashboard token');
  }

  const response = await fetch(`${getDashboardApiUrl()}/issues/grouping/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to run issue grouping');
  }

  return (await response.json()) as IssueGroupingRunResult;
}

export async function fetchCurrentGrouping(): Promise<IssueGroupingRunResult | null> {
  const token = await getDashboardAccessToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getDashboardApiUrl()}/issues/grouping/current`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  const payload = JSON.parse(raw) as IssueGroupingRunResult | null;
  if (!payload || !isToday(payload.generatedAt)) {
    return null;
  }

  return payload;
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
