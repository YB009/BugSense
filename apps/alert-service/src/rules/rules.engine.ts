import { Injectable, InternalServerErrorException, OnModuleDestroy } from '@nestjs/common';
import {
  AlertEvaluationJob,
  AlertThresholdRule,
  ProjectAlertRules,
} from '@bugsense/types';
import Redis from 'ioredis';
import { getAlertRuntimeConfig } from '../config/runtime-config';

interface AlertEvaluationResult {
  shouldTrigger: boolean;
  reason: string;
  currentCount?: number;
  threshold?: number;
  windowSeconds?: number;
  cooldownSeconds?: number;
}

@Injectable()
export class RulesEngine implements OnModuleDestroy {
  private readonly config = getAlertRuntimeConfig();
  private readonly redis = new Redis(this.config.redisConnection);

  async evaluate(job: AlertEvaluationJob): Promise<AlertEvaluationResult> {
    const rule = this.getRule(job.projectId, job.level);

    if (!rule) {
      return {
        shouldTrigger: false,
        reason: `No alert rule configured for project ${job.projectId} level ${job.level}`,
      };
    }

    const currentCount = await this.getRecentEventCount(job.projectId, job.level, rule);
    if (currentCount < rule.threshold) {
      return {
        shouldTrigger: false,
        reason: `Recent ${job.level} volume ${currentCount}/${rule.threshold} within ${rule.windowSeconds}s does not meet spike threshold`,
        currentCount,
        threshold: rule.threshold,
        windowSeconds: rule.windowSeconds,
        cooldownSeconds: rule.cooldownSeconds,
      };
    }

    const cooldownKey = `bugsense:alerts:cooldown:${job.projectId}:${job.level}`;
    const cooldownSet = await this.redis.set(
      cooldownKey,
      String(Date.now()),
      'EX',
      rule.cooldownSeconds,
      'NX',
    );

    if (cooldownSet !== 'OK') {
      return {
        shouldTrigger: false,
        reason: `Spike threshold met but alert cooldown is still active for project ${job.projectId} level ${job.level}`,
        currentCount,
        threshold: rule.threshold,
        windowSeconds: rule.windowSeconds,
        cooldownSeconds: rule.cooldownSeconds,
      };
    }

    return {
      shouldTrigger: true,
      reason: `Error spike detected: ${currentCount} ${job.level} event(s) in the last ${rule.windowSeconds}s`,
      currentCount,
      threshold: rule.threshold,
      windowSeconds: rule.windowSeconds,
      cooldownSeconds: rule.cooldownSeconds,
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  getRulesSummary() {
    return this.config.alertRules;
  }

  private getRule(projectId: string, level: AlertEvaluationJob['level']) {
    const projectRules = this.config.alertRules[projectId];
    const fallbackRules = this.config.alertRules['*'];

    return projectRules?.[level] ?? fallbackRules?.[level];
  }

  private async getRecentEventCount(
    projectId: string,
    level: AlertEvaluationJob['level'],
    rule: AlertThresholdRule,
  ) {
    const query = `
      SELECT count() AS event_count
      FROM ${this.config.clickhouseDb}.error_events
      WHERE project_id = '${escapeLiteral(projectId)}'
        AND level = '${escapeLiteral(level)}'
        AND toDateTime(received_at) >= now() - toIntervalSecond(${rule.windowSeconds})
      FORMAT JSONEachRow
    `.trim();

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
        `ClickHouse alert rule query failed: ${message}`,
      );
    }

    const raw = await response.text();
    const parsed = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { event_count?: string | number });

    return Number(parsed[0]?.event_count ?? 0);
  }
}

function buildClickHouseHeaders(config: ReturnType<typeof getAlertRuntimeConfig>) {
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

function escapeLiteral(value: string) {
  return value.replaceAll("'", "\\'");
}
