import { resolveWorkspacePath } from '@bugsense/config';
import {
  AlertEmailRecipientsConfig,
  AlertRulesConfig,
  AlertThresholdRule,
} from '@bugsense/types';

export function getAlertRuntimeConfig() {
  const alertRules = parseAlertRules(process.env.BUGSENSE_ALERT_RULES_JSON);
  const alertEmailRecipients = parseAlertEmailRecipients(
    process.env.BUGSENSE_ALERT_EMAILS_JSON,
  );

  return {
    port: parsePort(process.env.PORT, 3002),
    tcpHost: process.env.TCP_HOST ?? '127.0.0.1',
    tcpPort: parsePort(process.env.TCP_PORT, 4002),
    clickhouseUrl: process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123',
    clickhouseDb: process.env.CLICKHOUSE_DB ?? 'bugsense',
    clickhouseUser: process.env.CLICKHOUSE_USER,
    clickhousePassword: process.env.CLICKHOUSE_PASSWORD,
    geminiApiKey: process.env.GEMINI_API_KEY,
    nightlyGroupingModel:
      process.env.BUGSENSE_NIGHTLY_GROUPING_MODEL ?? 'gemma-3-12b-it',
    aiPanelModel:
      process.env.BUGSENSE_AI_PANEL_MODEL ?? 'gemini-2.5-flash',
    issuesStoragePath:
      process.env.BUGSENSE_ISSUES_STORAGE_PATH ??
      resolveWorkspacePath('storage', 'issues', 'grouped-issues.json'),
    alertRules,
    resendApiKey: process.env.RESEND_API_KEY,
    alertEmailFrom:
      process.env.BUGSENSE_ALERT_EMAIL_FROM ?? 'Bugsense <alerts@example.com>',
    alertEmailRecipients,
    redisConnection: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: parsePort(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null as null,
    },
  };
}

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAlertRules(value: string | undefined): AlertRulesConfig {
  if (!value) {
    return {
      '*': {
        error: {
          threshold: 5,
          windowSeconds: 300,
          cooldownSeconds: 900,
        },
      },
    };
  }

  try {
    const parsed = JSON.parse(value) as AlertRulesConfig;
    return normalizeAlertRules(parsed);
  } catch {
    return {
      '*': {
        error: {
          threshold: 5,
          windowSeconds: 300,
          cooldownSeconds: 900,
        },
      },
    };
  }
}

function normalizeAlertRules(config: AlertRulesConfig): AlertRulesConfig {
  return Object.fromEntries(
    Object.entries(config).map(([projectId, rules]) => [
      projectId,
      {
        error: normalizeRule(rules.error),
        warning: normalizeRule(rules.warning),
        info: normalizeRule(rules.info),
      },
    ]),
  );
}

function parseAlertEmailRecipients(
  value: string | undefined,
): AlertEmailRecipientsConfig {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([projectId, recipients]) => [
        projectId,
        normalizeRecipients(recipients),
      ]),
    );
  } catch {
    return {};
  }
}

function normalizeRecipients(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((recipient) => String(recipient).trim())
    .filter(Boolean);
}

function normalizeRule(rule: AlertThresholdRule | undefined) {
  if (!rule) {
    return undefined;
  }

  return {
    threshold: Math.max(1, Number(rule.threshold) || 1),
    windowSeconds: Math.max(60, Number(rule.windowSeconds) || 300),
    cooldownSeconds: Math.max(60, Number(rule.cooldownSeconds) || 900),
  };
}
