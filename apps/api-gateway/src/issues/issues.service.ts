import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getRegisteredDevServiceUrl } from '@bugsense/config';
import {
  FinishReason,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import {
  GroupedIssue,
  IssueAnalysisResult,
  IssueBreakdownItem,
  IssueDetail,
  IssueFrequencyPoint,
  IssueGroupingRunResult,
  IssueListItem,
} from '@bugsense/types';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class IssuesService {
  private readonly config = getApiGatewayRuntimeConfig();
  private readonly logger = new Logger(IssuesService.name);
  private readonly genAI = this.config.geminiApiKey
    ? new GoogleGenerativeAI(this.config.geminiApiKey)
    : null;

  async listIssues(projectIds: string[]): Promise<IssueListItem[]> {
    const issues = await this.loadIssues();
    return issues
      .filter((issue) => hasProjectAccess(projectIds, issue.projectId))
      .map((issue) => ({
        ...issue,
        totalEvents: issue.eventIds.length,
      }))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async getCurrentGrouping(projectIds: string[]): Promise<IssueGroupingRunResult | null> {
    const payload = await this.loadIssuesPayload();
    const issues = (payload.issues ?? []).filter((issue) =>
      hasProjectAccess(projectIds, issue.projectId),
    );
    if (!payload.generatedAt || issues.length === 0) {
      return null;
    }

    return {
      status: 'completed',
      groupedCount: issues.length,
      generatedAt: payload.generatedAt,
      issues,
    };
  }

  async getIssueDetail(issueId: string, projectIds: string[]): Promise<IssueDetail> {
    const issue = await this.getIssueById(issueId, projectIds);
    const breakdown = await this.queryBreakdown(issue.eventIds);

    return {
      issue,
      totalEvents: issue.eventIds.length,
      affectedUsers: breakdown.affectedUsers,
      browserBreakdown: breakdown.browserBreakdown,
      osBreakdown: breakdown.osBreakdown,
      frequencySeries: breakdown.frequencySeries,
      stackTrace: issue.sampleStackTrace,
    };
  }

  async analyzeIssue(
    issueId: string,
    projectIds: string[],
  ): Promise<IssueAnalysisResult> {
    const issue = await this.getIssueById(issueId, projectIds);
    const breakdown = await this.queryBreakdown(issue.eventIds);

    if (!this.config.geminiApiKey) {
      throw new ServiceUnavailableException(
        'Gemini analysis is unavailable: missing_gemini_key_or_google_ai_api_key',
      );
    }

    try {
      const { content, modelName } = await this.generateGeminiAnalysis(
        issueId,
        buildGeminiAnalysisPrompt(issue, breakdown),
      );

      const parsed = extractStructuredGeminiJson(content) as {
        rootCause?: string;
        suggestedFix?: string;
        evidence?: string[];
        waysToImproveConfidence?: string[];
        confidenceScore?: number;
        confidence?: 'low' | 'medium' | 'high';
      };

      if (!parsed.rootCause || !parsed.suggestedFix) {
        this.logger.warn(`Gemini analysis fallback for ${issueId}: missing required fields`);
        throw new BadGatewayException(
          'Gemini analysis failed: gemini_missing_required_fields',
        );
      }

      const confidenceScore = normalizeConfidenceScore(parsed.confidenceScore);
      const confidence = parsed.confidence ?? confidenceLabelFromScore(confidenceScore);

      return {
        issueId: issue.issueId,
        model: modelName,
        provider: 'gemini',
        rootCause: parsed.rootCause,
        suggestedFix: parsed.suggestedFix,
        confidence,
        confidenceScore,
        evidence: normalizeStringList(parsed.evidence, [
          `${issue.eventIds.length} grouped event(s) were included in the issue snapshot.`,
        ]),
        waysToImproveConfidence: normalizeStringList(parsed.waysToImproveConfidence, [
          'Capture source maps for the failing release so stack frames point to the original source.',
          'Include request payload metadata and response status details for the failing call.',
          'Attach affected user/session breadcrumbs leading into the crash path.',
        ]),
      };
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      if (error instanceof GoogleGenerativeAIFetchError) {
        const detail = truncateReason(error.message);
        this.logger.warn(`Gemini analysis fallback for ${issueId}: ${detail}`);
        throw new BadGatewayException(
          `Gemini analysis failed: gemini_http_${error.status ?? 'unknown'}:${detail}`,
        );
      }

      if (error instanceof GoogleGenerativeAIResponseError) {
        const blockReason = error.response?.promptFeedback?.blockReason;
        const finishReason = error.response?.candidates?.[0]?.finishReason;
        const responseReason = blockReason
          ? `gemini_blocked:${blockReason}`
          : finishReason
            ? `gemini_response_error:${finishReason}`
            : `gemini_response_error:${truncateReason(error.message)}`;
        this.logger.warn(
          `Gemini analysis fallback for ${issueId}: ${responseReason}`,
        );
        throw new BadGatewayException(`Gemini analysis failed: ${responseReason}`);
      }

      const message =
        error instanceof Error ? truncateReason(error.message) : 'unknown_error';
      this.logger.warn(`Gemini analysis fallback for ${issueId}: ${message}`);
      throw new BadGatewayException(
        `Gemini analysis failed: gemini_exception:${message}`,
      );
    }
  }

  private async generateGeminiAnalysis(issueId: string, prompt: string) {
    const modelsToTry = buildGeminiModelCandidates(this.config.aiPanelModel);
    let lastError: unknown;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          this.logger.debug(
            `Gemini analysis request for ${issueId} using model ${modelName} and key prefix ${maskSecretPrefix(
              this.config.geminiApiKey!,
            )} (attempt ${attempt}/3)`,
          );

          const model = this.genAI!.getGenerativeModel(
            {
              model: modelName,
              generationConfig: {
                responseMimeType: 'application/json',
              },
              safetySettings: [
                {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
              ],
            },
            {
              apiVersion: 'v1beta',
            },
          );

          const result = await model.generateContent(prompt);
          const response = result.response;
          const payload = response as typeof response & {
            promptFeedback?: {
              blockReason?: string;
              blockReasonMessage?: string;
            };
          };
          const content = response.text();

          if (!content) {
            const finishReason = response.candidates?.[0]?.finishReason;
            const blockReason = payload.promptFeedback?.blockReason;
            const reason = blockReason
              ? `gemini_blocked:${blockReason}`
              : finishReason
                ? `gemini_empty_content:${finishReason}`
                : 'gemini_empty_content';
            this.logger.warn(`Gemini analysis fallback for ${issueId}: ${reason}`);
            throw new BadGatewayException(`Gemini analysis failed: ${reason}`);
          }

          return { content, modelName };
        } catch (error) {
          lastError = error;

          if (!isRetryableGeminiError(error) || attempt === 3) {
            break;
          }

          const detail =
            error instanceof Error ? truncateReason(error.message) : 'unknown_error';
          this.logger.warn(
            `Retrying Gemini analysis for ${issueId} with model ${modelName} after transient failure (${attempt}/3): ${detail}`,
          );
          await delay(attempt * 750);
        }
      }
    }

    throw lastError;
  }

  async runGrouping(): Promise<IssueGroupingRunResult> {
    const alertServiceUrl = getRegisteredDevServiceUrl(
      'alert-service',
      this.config.alertServiceUrl,
    );
    try {
      const response = await fetch(`${alertServiceUrl}/issues/grouping/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new BadGatewayException(
          `Failed to run issue grouping via alert-service: ${message || `HTTP ${response.status}`}`,
        );
      }

      return (await response.json()) as IssueGroupingRunResult;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message =
        error instanceof Error ? truncateReason(error.message) : 'unknown_error';

      throw new ServiceUnavailableException(
        `Failed to reach alert-service at ${alertServiceUrl}/issues/grouping/run: ${message}`,
      );
    }
  }

  async clearTodayIssues(projectIds: string[]) {
    if (projectIds.length === 0) {
      return {
        status: 'cleared' as const,
        clearedAt: new Date().toISOString(),
        clearedEvents: 0,
        clearedGroupedIssues: 0,
      };
    }

    const payload = await this.loadIssuesPayload();
    const allIssues = payload.issues ?? [];
    const remainingIssues = allIssues.filter(
      (issue) => !hasProjectAccess(projectIds, issue.projectId),
    );
    const clearedGroupedIssues = allIssues.length - remainingIssues.length;

    await this.saveIssuesPayload({
      count: remainingIssues.length,
      generatedAt: remainingIssues.length > 0 ? new Date().toISOString() : undefined,
      issues: remainingIssues,
    });

    const clearedEvents = await this.deleteTodayEvents(projectIds);

    return {
      status: 'cleared' as const,
      clearedAt: new Date().toISOString(),
      clearedEvents,
      clearedGroupedIssues,
    };
  }

  private async getIssueById(issueId: string, projectIds: string[]) {
    const issues = await this.loadIssues();
    const issue = issues.find(
      (candidate) =>
        candidate.issueId === issueId &&
        hasProjectAccess(projectIds, candidate.projectId),
    );

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
    count?: number;
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

  private async saveIssuesPayload(payload: {
    count?: number;
    generatedAt?: string;
    issues?: GroupedIssue[];
  }) {
    await mkdir(dirname(this.config.issuesStoragePath), { recursive: true });
    await writeFile(this.config.issuesStoragePath, JSON.stringify(payload, null, 2), 'utf8');
  }

  private async queryBreakdown(eventIds: string[]) {
    if (eventIds.length === 0) {
      return {
        affectedUsers: 0,
        browserBreakdown: [] as IssueBreakdownItem[],
        osBreakdown: [] as IssueBreakdownItem[],
        frequencySeries: [] as IssueFrequencyPoint[],
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

    const frequencyQuery = `
      SELECT
        toString(occurred_at) AS occurred_at_text,
        count() AS count
      FROM ${this.config.clickhouseDb}.error_events
      WHERE ${whereClause}
      GROUP BY occurred_at
      ORDER BY occurred_at ASC
      FORMAT JSONEachRow
    `.trim();

    const [affectedUsersRows, browserRows, osRows, frequencyRows] = await Promise.all([
      this.runClickHouseQuery<{ affected_users?: number | string }>(affectedUsersQuery),
      this.runClickHouseQuery<{ label?: string; count?: number | string }>(browserQuery),
      this.runClickHouseQuery<{ label?: string; count?: number | string }>(osQuery),
      this.runClickHouseQuery<{ occurred_at_text?: string; count?: number | string }>(frequencyQuery),
    ]);

    return {
      affectedUsers: Number(affectedUsersRows[0]?.affected_users ?? 0),
      browserBreakdown: browserRows.map(toBreakdownItem),
      osBreakdown: osRows.map(toBreakdownItem),
      frequencySeries: frequencyRows.map((row) => ({
        occurredAt: new Date(String(row.occurred_at_text)).toISOString(),
        count: Number(row.count ?? 0),
      })),
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

  private async runClickHouseMutation(query: string) {
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
        `ClickHouse issue mutation failed: ${message}`,
      );
    }
  }

  private async countTodayEvents(projectIds: string[]) {
    if (projectIds.length === 0) {
      return 0;
    }

    const query = `
      SELECT count() AS count
      FROM ${this.config.clickhouseDb}.error_events
      WHERE received_at >= toStartOfDay(now())
        AND project_id IN (${projectIds.map(toClickHouseStringLiteral).join(', ')})
      FORMAT JSONEachRow
    `.trim();

    const rows = await this.runClickHouseQuery<{ count?: string | number }>(query);
    return Number(rows[0]?.count ?? 0);
  }

  private async deleteTodayEvents(projectIds: string[]) {
    if (projectIds.length === 0) {
      return 0;
    }

    const clearedEvents = await this.countTodayEvents(projectIds);
    if (clearedEvents === 0) {
      return 0;
    }

    const query = `
      ALTER TABLE ${this.config.clickhouseDb}.error_events
      DELETE WHERE received_at >= toStartOfDay(now())
        AND project_id IN (${projectIds.map(toClickHouseStringLiteral).join(', ')})
      SETTINGS mutations_sync = 1
    `.trim();

    await this.runClickHouseMutation(query);
    return clearedEvents;
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

function hasProjectAccess(projectIds: string[], projectId: string) {
  return projectIds.includes('*') || projectIds.includes(projectId);
}

function buildGeminiModelCandidates(primaryModel: string) {
  const candidates = [primaryModel];

  if (primaryModel === 'gemini-2.5-flash') {
    candidates.push('gemini-2.5-flash-lite');
  }

  return [...new Set(candidates)];
}

function isRetryableGeminiError(error: unknown) {
  if (error instanceof GoogleGenerativeAIFetchError) {
    return [429, 500, 502, 503, 504].includes(error.status ?? 0);
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('503') ||
    error.message.includes('429') ||
    error.message.includes('timed out') ||
    error.message.includes('ECONNRESET')
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function toClickHouseStringLiteral(value: string) {
  return `'${value.replaceAll("'", "\\'")}'`;
}

function buildGeminiAnalysisPrompt(
  issue: GroupedIssue,
  breakdown: Awaited<ReturnType<IssuesService['queryBreakdown']>>,
) {
  return JSON.stringify({
    instruction: [
      'You are diagnosing a software production issue cluster.',
      'Return JSON only.',
      'Provide a specific probable root cause, a concrete suggested fix, a model-estimated confidence score from 0 to 100,',
      'a confidence label of low/medium/high consistent with that score,',
      'an evidence array listing the strongest signals you used,',
      'and a waysToImproveConfidence array listing the next 3 best signals or instrumentation changes that would make the diagnosis more reliable.',
      'Do not return markdown fences.',
      'Schema:',
      '{',
      '"rootCause": string,',
      '"suggestedFix": string,',
      '"confidenceScore": number,',
      '"confidence": "low" | "medium" | "high",',
      '"evidence": string[],',
      '"waysToImproveConfidence": string[]',
      '}',
    ].join(' '),
    issue: {
      title: issue.title,
      summary: issue.summary,
      sampleMessage: issue.sampleMessage,
      sampleStackTrace: issue.sampleStackTrace.slice(0, 6000),
      fingerprints: issue.fingerprints,
      platforms: issue.platforms,
      environments: issue.environments,
      totalEvents: issue.eventIds.length,
      firstSeenAt: issue.firstSeenAt,
      lastSeenAt: issue.lastSeenAt,
      browserBreakdown: breakdown.browserBreakdown,
      osBreakdown: breakdown.osBreakdown,
      affectedUsers: breakdown.affectedUsers,
      frequencySeries: breakdown.frequencySeries.slice(-12),
    },
  });
}

function extractStructuredGeminiJson(content: string) {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  return JSON.parse(withoutFence);
}

function normalizeConfidenceScore(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 60;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceLabelFromScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 75) {
    return 'high';
  }

  if (score >= 45) {
    return 'medium';
  }

  return 'low';
}

function normalizeStringList(value: string[] | undefined, fallback: string[]) {
  const normalized = (value ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return normalized.length > 0 ? normalized : fallback;
}

function truncateReason(value: string, limit = 140) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit)}...`;
}

function maskSecretPrefix(value: string) {
  if (!value) {
    return 'missing';
  }

  return `${value.slice(0, 4)}***`;
}
