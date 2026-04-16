import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import {
  GroupedIssue,
  GroupingCandidateEvent,
} from '@bugsense/types';
import { createHash } from 'crypto';
import { getAlertRuntimeConfig } from '../config/runtime-config';

interface ModelCluster {
  title: string;
  summary: string;
  eventIds: string[];
}

@Injectable()
export class OpenAiGroupingService {
  private readonly logger = new Logger(OpenAiGroupingService.name);
  private readonly config = getAlertRuntimeConfig();
  private readonly client = this.config.geminiApiKey
    ? new GoogleGenAI({ apiKey: this.config.geminiApiKey })
    : null;

  async groupEvents(events: GroupingCandidateEvent[]): Promise<GroupedIssue[]> {
    if (events.length === 0) {
      return [];
    }

    const clusters = this.client
      ? await this.groupWithGemini(events)
      : heuristicClusters(events);

    return normalizeClusters(clusters, events)
      .map((cluster) => toGroupedIssue(cluster, events))
      .filter((issue): issue is GroupedIssue => issue !== null);
  }

  private async groupWithGemini(
    events: GroupingCandidateEvent[],
  ): Promise<ModelCluster[]> {
    try {
      const response = await this.client!.models.generateContent({
        model: this.config.nightlyGroupingModel,
        contents: JSON.stringify({
          instruction:
            [
              'Cluster similar error events into issues for a nightly background job.',
              'Return JSON only with { "clusters": [{ "title": string, "summary": string, "eventIds": string[] }] }.',
              'Issue titles must be short, human-readable problem names, not a copy of the raw error message.',
              'Prefer names like "Firebase authentication API blocked by CORS", "Project list request failing with network error", or "Dashboard route crashes while loading organization data".',
              'Do not include secrets, full query strings, tokens, or long URLs in titles.',
            ].join(' '),
          events: events.map((event) => ({
            eventId: event.eventId,
            projectId: event.projectId,
            fingerprint: event.issueFingerprint,
            message: event.message,
            exceptionType: event.exceptionType,
            stackTrace: event.stackTrace.slice(0, 2000),
            requestUrl: event.requestUrl,
            metadata: parseMetadata(event.metadataJson),
            environment: event.environment,
            platform: event.platform,
          })),
        }),
      });
      const content = response.text;
      if (!content) {
        return heuristicClusters(events);
      }

      const parsed = JSON.parse(content) as { clusters?: ModelCluster[] };
      if (!Array.isArray(parsed.clusters) || parsed.clusters.length === 0) {
        return heuristicClusters(events);
      }

      return parsed.clusters;
    } catch (error) {
      this.logger.error(
        `Gemini grouping failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return heuristicClusters(events);
    }
  }
}

function heuristicClusters(events: GroupingCandidateEvent[]): ModelCluster[] {
  const buckets = new Map<string, GroupingCandidateEvent[]>();

  for (const event of events) {
    const key = canonicalGroupingKey(event);
    const current = buckets.get(key) ?? [];
    current.push(event);
    buckets.set(key, current);
  }

  return Array.from(buckets.values()).map((bucket) => ({
    title: buildIssueTitle(bucket),
    summary: buildIssueSummary(bucket),
    eventIds: bucket.map((event) => event.eventId),
  }));
}

function normalizeClusters(
  clusters: ModelCluster[],
  events: GroupingCandidateEvent[],
): ModelCluster[] {
  const eventsById = new Map(events.map((event) => [event.eventId, event]));
  const buckets = new Map<
    string,
    { title: string; summary: string; eventIds: Set<string> }
  >();

  for (const cluster of clusters) {
    for (const eventId of cluster.eventIds) {
      const event = eventsById.get(eventId);
      if (!event) {
        continue;
      }

      const key = canonicalGroupingKey(event);
      const current =
        buckets.get(key) ??
        {
          title: cluster.title,
          summary: cluster.summary,
          eventIds: new Set<string>(),
        };

      current.eventIds.add(event.eventId);
      buckets.set(key, current);
    }
  }

  return Array.from(buckets.values()).map((bucket) => ({
    title: bucket.title,
    summary: bucket.summary,
    eventIds: Array.from(bucket.eventIds),
  }));
}

function buildIssueTitle(events: GroupingCandidateEvent[]) {
  const sample = events[0];
  const normalizedMessage = normalizeMessage(sample.message);
  const endpoint = extractEndpoint(sample.message) ?? extractEndpoint(sample.stackTrace);
  const request = getRequestContext(sample);
  const requestEndpoint = request.path ?? endpoint;
  const requestMethod = request.method ?? networkVerb(sample.message);
  const exceptionType = sample.exceptionType ?? 'Error';

  if (isNetworkFailure(sample.message)) {
    const target = requestEndpoint ? ` ${requestEndpoint}` : '';
    return `${requestMethod}${target} request blocked or unreachable`;
  }

  if (/firebase/i.test(sample.message) || /firebase/i.test(sample.stackTrace)) {
    return `Firebase ${normalizedMessage}`;
  }

  if (/cannot read properties|undefined|null/i.test(sample.message)) {
    return `Null reference crash in ${sample.platform} app`;
  }

  if (/timeout/i.test(sample.message)) {
    return `${requestEndpoint ? `${requestEndpoint} ` : ''}request timed out`;
  }

  return `${exceptionType}: ${normalizedMessage}`.slice(0, 120);
}

function buildIssueSummary(events: GroupingCandidateEvent[]) {
  const sample = events[0];
  const request = getRequestContext(sample);
  const endpoint =
    request.path ?? extractEndpoint(sample.message) ?? extractEndpoint(sample.stackTrace);
  const location = endpoint ? ` around ${endpoint}` : '';

  return [
    `Grouped ${events.length} related event(s)${location}.`,
    `The latest sample is a ${sample.exceptionType ?? 'runtime error'} in ${sample.environment} on ${sample.platform}.`,
    `Fingerprint ${sample.issueFingerprint.slice(0, 12)}.`,
  ].join(' ');
}

function normalizeMessage(message: string) {
  return message
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[?&](key|token|apiKey|apikey|password|secret)=[^&\s]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

function extractEndpoint(value: string) {
  const methodMatch = value.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+([^\s]+)\b/i);
  if (methodMatch) {
    return sanitizePath(methodMatch[2]);
  }

  const urlMatch = value.match(/https?:\/\/[^/\s]+([^\s'"`)]*)/i);
  if (urlMatch) {
    return sanitizePath(urlMatch[1] || '/');
  }

  return null;
}

function sanitizePath(path: string) {
  const [pathname] = path.split('?');
  return pathname
    .replace(/\/[a-z0-9_-]{16,}/gi, '/:id')
    .replace(/\/[a-z0-9_-]{8,}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .slice(0, 80);
}

function isNetworkFailure(message: string) {
  return /network|cors|failed to fetch|load failed|err_failed/i.test(message);
}

function networkVerb(message: string) {
  const match = message.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i);
  return match ? match[1].toUpperCase() : 'Network';
}

function toGroupedIssue(
  cluster: ModelCluster,
  events: GroupingCandidateEvent[],
): GroupedIssue | null {
  const clusterEventIds = new Set(cluster.eventIds);
  const matches = events.filter((event) => clusterEventIds.has(event.eventId));

  if (matches.length === 0) {
    return null;
  }

  const firstSeenAt = matches.reduce(
    (min, event) => (event.receivedAt < min ? event.receivedAt : min),
    matches[0].receivedAt,
  );
  const lastSeenAt = matches.reduce(
    (max, event) => (event.receivedAt > max ? event.receivedAt : max),
    matches[0].receivedAt,
  );
  const clusterKey = stableClusterKey(matches);

  return {
    issueId: `issue_${clusterKey.slice(0, 24)}`,
    projectId: matches[0].projectId,
    clusterKey,
    title: chooseIssueTitle(cluster.title, matches),
    summary: buildIssueSummary(matches),
    eventIds: matches.map((event) => event.eventId),
    fingerprints: Array.from(new Set(matches.map((event) => event.issueFingerprint))),
    sampleMessage: matches[0].message,
    sampleStackTrace: matches[0].stackTrace,
    environments: Array.from(new Set(matches.map((event) => event.environment))),
    platforms: Array.from(new Set(matches.map((event) => event.platform))),
    firstSeenAt,
    lastSeenAt,
    updatedAt: new Date().toISOString(),
  };
}

function chooseIssueTitle(
  modelTitle: string | undefined,
  events: GroupingCandidateEvent[],
) {
  const fallback = buildIssueTitle(events);
  const title = normalizeMessage(modelTitle ?? '');
  const sampleMessage = normalizeMessage(events[0].message);

  if (!title) {
    return fallback;
  }

  if (title === sampleMessage || title.includes('?') || /key=|token=/i.test(title)) {
    return fallback;
  }

  return title;
}

function canonicalGroupingKey(event: GroupingCandidateEvent) {
  const request = getRequestContext(event);
  const exceptionType = normalizeToken(event.exceptionType ?? 'Error');
  const environment = normalizeToken(event.environment);
  const platform = normalizeToken(event.platform);

  if (isNetworkFailure(event.message)) {
    const method = request.method ?? networkVerb(event.message);
    const path =
      request.path ??
      extractEndpoint(event.message) ??
      extractEndpoint(event.stackTrace) ??
      '/unknown';
    const status = normalizeToken(request.statusLabel ?? 'CORS/Network');

    return [
      event.projectId,
      environment,
      platform,
      'network',
      method,
      path,
      status,
    ].join('|');
  }

  return [
    event.projectId,
    environment,
    platform,
    exceptionType,
    normalizeMessage(event.message),
    normalizeStackLocation(event.stackTrace),
  ].join('|');
}

function stableClusterKey(events: GroupingCandidateEvent[]) {
  const keys = Array.from(new Set(events.map(canonicalGroupingKey))).sort();
  return createHash('sha256').update(keys.join('|')).digest('hex');
}

function parseMetadata(metadataJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(metadataJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function getRequestContext(event: GroupingCandidateEvent) {
  const metadata = parseMetadata(event.metadataJson);
  const fullUrl = stringValue(metadata.fullUrl) ?? stringValue(metadata.url) ?? event.requestUrl;
  const method = stringValue(metadata.method)?.toUpperCase() ?? networkVerb(event.message);
  const statusLabel = stringValue(metadata.statusLabel) ?? stringValue(metadata.status);
  const path = fullUrl ? sanitizeUrlPath(fullUrl) : extractEndpoint(event.message);

  return {
    method,
    path,
    statusLabel,
  };
}

function sanitizeUrlPath(value: string) {
  try {
    const parsed = new URL(value, 'http://placeholder.local');
    return sanitizePath(parsed.pathname);
  } catch {
    return sanitizePath(value);
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizeStackLocation(stackTrace: string) {
  const line =
    stackTrace
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item && !/node_modules|webpack|next\/dist/i.test(item)) ?? '';

  return line
    .replace(/:\d+:\d+/g, ':line:col')
    .replace(/:\d+/g, ':line')
    .replace(/https?:\/\/\S+/g, '[url]')
    .slice(0, 120);
}
