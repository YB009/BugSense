import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import {
  GroupedIssue,
  GroupingCandidateEvent,
} from '@bugsense/types';
import { createHash, randomUUID } from 'crypto';
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

    return clusters
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
            'Cluster similar error events into issues for a nightly background job. Return JSON only with { "clusters": [{ "title": string, "summary": string, "eventIds": string[] }] }.',
          events: events.map((event) => ({
            eventId: event.eventId,
            projectId: event.projectId,
            fingerprint: event.issueFingerprint,
            message: event.message,
            exceptionType: event.exceptionType,
            stackTrace: event.stackTrace.slice(0, 2000),
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
    const key = `${event.projectId}:${event.issueFingerprint}`;
    const current = buckets.get(key) ?? [];
    current.push(event);
    buckets.set(key, current);
  }

  return Array.from(buckets.values()).map((bucket) => ({
    title: bucket[0].message.slice(0, 120),
    summary: `Grouped ${bucket.length} event(s) with fingerprint ${bucket[0].issueFingerprint.slice(0, 12)}.`,
    eventIds: bucket.map((event) => event.eventId),
  }));
}

function toGroupedIssue(
  cluster: ModelCluster,
  events: GroupingCandidateEvent[],
): GroupedIssue | null {
  const matches = events.filter((event) => cluster.eventIds.includes(event.eventId));

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
  const clusterKey = createHash('sha256')
    .update(matches.map((event) => event.issueFingerprint).sort().join('|'))
    .digest('hex');

  return {
    issueId: randomUUID(),
    projectId: matches[0].projectId,
    clusterKey,
    title: cluster.title || matches[0].message.slice(0, 120),
    summary: cluster.summary || `Grouped ${matches.length} related event(s).`,
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
