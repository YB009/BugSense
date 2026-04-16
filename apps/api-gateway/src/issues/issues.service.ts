import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupedIssue,
  IssueAnalysisResult,
  IssueBreakdownItem,
  IssueDetail,
  IssueGroupingRunResult,
  IssueListItem,
} from '@bugsense/types';
import { readFile } from 'fs/promises';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class IssuesService {
  private readonly config = getApiGatewayRuntimeConfig();

  async listIssues(): Promise<IssueListItem[]> {
    const issues = await this.loadIssues();
    return issues
      .map((issue) => ({
        ...issue,
        totalEvents: issue.eventIds.length,
      }))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async getCurrentGrouping(): Promise<IssueGroupingRunResult | null> {
    const payload = await this.loadIssuesPayload();
    if (!payload.generatedAt || !payload.issues?.length) {
      return null;
    }

    return {
      status: 'completed',
      groupedCount: payload.issues.length,
      generatedAt: payload.generatedAt,
      issues: payload.issues,
    };
  }

  async getIssueDetail(issueId: string): Promise<IssueDetail> {
    const issue = await this.getIssueById(issueId);
    const breakdown = await this.queryBreakdown(issue.eventIds);

    return {
      issue,
      totalEvents: issue.eventIds.length,
      affectedUsers: breakdown.affectedUsers,
      browserBreakdown: breakdown.browserBreakdown,
      osBreakdown: breakdown.osBreakdown,
      stackTrace: issue.sampleStackTrace,
    };
  }

  async analyzeIssue(issueId: string): Promise<IssueAnalysisResult> {
    const issue = await this.getIssueById(issueId);

    if (!this.config.geminiApiKey) {
      return heuristicAnalysis(issue, this.config.aiPanelModel);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.aiPanelModel}:generateContent?key=${this.config.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: JSON.stringify({
                      instruction:
                        'Given this software error issue, return JSON only with { "rootCause": string, "suggestedFix": string, "confidence": "low" | "medium" | "high" }.',
                      issue: {
                        title: issue.title,
                        summary: issue.summary,
                        sampleMessage: issue.sampleMessage,
                        sampleStackTrace: issue.sampleStackTrace.slice(0, 4000),
                        platforms: issue.platforms,
                        environments: issue.environments,
                      },
                    }),
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        return heuristicAnalysis(issue, this.config.aiPanelModel);
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };
      const content =
        payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        return heuristicAnalysis(issue, this.config.aiPanelModel);
      }

      const parsed = JSON.parse(content) as {
        rootCause?: string;
        suggestedFix?: string;
        confidence?: 'low' | 'medium' | 'high';
      };

      if (!parsed.rootCause || !parsed.suggestedFix) {
        return heuristicAnalysis(issue, this.config.aiPanelModel);
      }

      return {
        issueId: issue.issueId,
        model: this.config.aiPanelModel,
        provider: 'gemini',
        rootCause: parsed.rootCause,
        suggestedFix: parsed.suggestedFix,
        confidence: parsed.confidence ?? 'medium',
      };
    } catch {
      return heuristicAnalysis(issue, this.config.aiPanelModel);
    }
  }

  async runGrouping(): Promise<IssueGroupingRunResult> {
    const response = await fetch(
      `${this.config.alertServiceUrl}/issues/grouping/run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new InternalServerErrorException(
        `Failed to run issue grouping: ${message}`,
      );
    }

    return (await response.json()) as IssueGroupingRunResult;
  }

  private async getIssueById(issueId: string) {
    const issues = await this.loadIssues();
    const issue = issues.find((candidate) => candidate.issueId === issueId);

    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} was not found`);
    }

    return issue;
  }

  private async loadIssues(): Promise<GroupedIssue[]> {
    const payload = await this.loadIssuesPayload();
    return payload.issues ?? [];
  }

  private async loadIssuesPayload(): Promise<{
    generatedAt?: string;
    issues?: GroupedIssue[];
  }> {
    try {
      const contents = await readFile(this.config.issuesStoragePath, 'utf8');
      return JSON.parse(contents) as {
        generatedAt?: string;
        issues?: GroupedIssue[];
      };
    } catch {
      return {};
    }
  }

  private async queryBreakdown(eventIds: string[]) {
    if (eventIds.length === 0) {
      return {
        affectedUsers: 0,
        browserBreakdown: [] as IssueBreakdownItem[],
        osBreakdown: [] as IssueBreakdownItem[],
      };
    }

    const whereClause = buildEventWhereClause(eventIds);
    const affectedUsersQuery = `
      SELECT count(DISTINCT user_id) AS affected_users
      FROM ${this.config.clickhouseDb}.error_events
      WHERE ${whereClause}
      FORMAT JSONEachRow
    `.trim();

    const browserQuery = `
      SELECT browser_name AS label, count() AS count
      FROM ${this.config.clickhouseDb}.error_events
      WHERE ${whereClause} AND browser_name IS NOT NULL AND browser_name != ''
      GROUP BY browser_name
      ORDER BY count DESC
      LIMIT 6
      FORMAT JSONEachRow
    `.trim();

    const osQuery = `
      SELECT os_name AS label, count() AS count
      FROM ${this.config.clickhouseDb}.error_events
      WHERE ${whereClause} AND os_name IS NOT NULL AND os_name != ''
      GROUP BY os_name
      ORDER BY count DESC
      LIMIT 6
      FORMAT JSONEachRow
    `.trim();

    const [affectedUsersRows, browserRows, osRows] = await Promise.all([
      this.runClickHouseQuery<{ affected_users?: number | string }>(affectedUsersQuery),
      this.runClickHouseQuery<{ label?: string; count?: number | string }>(browserQuery),
      this.runClickHouseQuery<{ label?: string; count?: number | string }>(osQuery),
    ]);

    return {
      affectedUsers: Number(affectedUsersRows[0]?.affected_users ?? 0),
      browserBreakdown: browserRows.map(toBreakdownItem),
      osBreakdown: osRows.map(toBreakdownItem),
    };
  }

  private async runClickHouseQuery<T extends Record<string, unknown>>(query: string) {
    const response = await fetch(
      `${this.config.clickhouseUrl}/?query=${encodeURIComponent(query)}`,
      {
        method: 'POST',
        headers: buildClickHouseHeaders(this.config),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new InternalServerErrorException(
        `ClickHouse issue query failed: ${message}`,
      );
    }

    const raw = await response.text();
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  }
}

function buildClickHouseHeaders(config: ReturnType<typeof getApiGatewayRuntimeConfig>) {
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
  };

  if (config.clickhouseUser) {
    headers['X-ClickHouse-User'] = config.clickhouseUser;
  }

  if (config.clickhousePassword) {
    headers['X-ClickHouse-Key'] = config.clickhousePassword;
  }

  return headers;
}

function buildEventWhereClause(eventIds: string[]) {
  const literals = eventIds.map((eventId) => `'${eventId.replaceAll("'", "\\'")}'`);
  return `event_id IN (${literals.join(', ')})`;
}

function toBreakdownItem(row: { label?: string; count?: string | number }): IssueBreakdownItem {
  return {
    label: row.label || 'Unknown',
    count: Number(row.count ?? 0),
  };
}

function heuristicAnalysis(
  issue: GroupedIssue,
  model: string,
): IssueAnalysisResult {
  return {
    issueId: issue.issueId,
    model,
    provider: 'heuristic',
    rootCause:
      issue.sampleMessage || 'Likely caused by an unhandled exception path in the application code.',
    suggestedFix:
      'Inspect the top stack frames, guard the failing code path, and add validation around the inputs that reach this exception.',
    confidence: 'medium',
  };
}
