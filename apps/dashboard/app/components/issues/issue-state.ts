'use client';

export type IssueWorkflowStatus = 'unresolved' | 'resolved' | 'ignored';

interface StoredIssueWorkflowState {
  status: IssueWorkflowStatus;
  changedAt: string;
}

export type StoredIssueWorkflowMap = Record<string, StoredIssueWorkflowState>;

const STORAGE_KEY = 'bugsense:issue-workflow:v1';

export function getIssueWorkflowState(
  issueId: string,
  lastSeenAt: string,
  map?: StoredIssueWorkflowMap,
) {
  const stored = (map ?? readIssueWorkflowMap())[issueId];

  if (!stored) {
    return {
      status: 'unresolved' as IssueWorkflowStatus,
      isRegression: false,
    };
  }

  const lastSeen = new Date(lastSeenAt).getTime();
  const changedAt = new Date(stored.changedAt).getTime();
  const isRegression = stored.status === 'resolved' && lastSeen > changedAt;

  return {
    status: isRegression ? ('unresolved' as IssueWorkflowStatus) : stored.status,
    isRegression,
  };
}

export function persistIssueWorkflowState(
  issueId: string,
  status: IssueWorkflowStatus,
) {
  const map = readIssueWorkflowMap();
  map[issueId] = {
    status,
    changedAt: new Date().toISOString(),
  };
  writeIssueWorkflowMap(map);
}

export function readIssueWorkflowMap() {
  if (typeof window === 'undefined') {
    return {} as StoredIssueWorkflowMap;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {} as StoredIssueWorkflowMap;
    }

    return JSON.parse(raw) as StoredIssueWorkflowMap;
  } catch {
    return {} as StoredIssueWorkflowMap;
  }
}

function writeIssueWorkflowMap(value: StoredIssueWorkflowMap) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
