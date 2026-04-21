import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { getAlertRuntimeConfig } from '../config/runtime-config';

interface AlertNotification {
  eventId: string;
  projectId: string;
  reason: string;
  message: string;
  fingerprint: string;
  receivedAt: string;
  currentCount?: number;
  threshold?: number;
  windowSeconds?: number;
  cooldownSeconds?: number;
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);
  private readonly config = getAlertRuntimeConfig();
  private readonly resend = this.config.resendApiKey
    ? new Resend(this.config.resendApiKey)
    : undefined;

  async sendAlert(notification: AlertNotification) {
    const recipients = await this.resolveRecipients(notification.projectId);
    const summary = this.formatSummary(notification);

    this.logger.warn(summary);

    if (!this.resend) {
      this.logger.debug(
        `Skipping alert email for project ${notification.projectId}: RESEND_API_KEY is not configured`,
      );
      return;
    }

    if (recipients.length === 0) {
      this.logger.debug(
        `Skipping alert email for project ${notification.projectId}: no recipients configured`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.config.alertEmailFrom,
        to: recipients,
        subject: `Bugsense alert: ${notification.projectId} error spike`,
        text: this.formatEmailText(notification),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown email delivery error';
      this.logger.error(
        `Failed to send alert email for project ${notification.projectId}: ${message}`,
      );
    }
  }

  private async resolveRecipients(projectId: string) {
    const configuredRecipients =
      this.config.alertEmailRecipients[projectId] ??
      this.config.alertEmailRecipients['*'];

    if (configuredRecipients?.length) {
      return configuredRecipients;
    }

    try {
      const response = await fetch(
        `${this.config.apiGatewayUrl}/projects/internal/${encodeURIComponent(
          projectId,
        )}/alert-recipients`,
        {
          headers: {
            'x-bugsense-internal-token': this.config.internalServiceToken,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as { emails?: unknown };
      return Array.isArray(payload.emails)
        ? payload.emails
            .map((email) => String(email).trim())
            .filter(Boolean)
        : [];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown recipient lookup error';
      this.logger.error(
        `Failed to resolve alert recipients for project ${projectId}: ${message}`,
      );
      return [];
    }
  }

  private formatSummary(notification: AlertNotification) {
    return `Alert triggered for project ${notification.projectId} event ${notification.eventId}: ${notification.reason} | ${notification.message} | ${notification.fingerprint} | count=${notification.currentCount ?? 'n/a'} threshold=${notification.threshold ?? 'n/a'} window=${notification.windowSeconds ?? 'n/a'}s cooldown=${notification.cooldownSeconds ?? 'n/a'}s | ${notification.receivedAt}`;
  }

  private formatEmailText(notification: AlertNotification) {
    return [
      `Bugsense alert triggered for project ${notification.projectId}.`,
      '',
      `Reason: ${notification.reason}`,
      `Message: ${notification.message}`,
      `Fingerprint: ${notification.fingerprint}`,
      `Event ID: ${notification.eventId}`,
      `Received At: ${notification.receivedAt}`,
      `Current Count: ${notification.currentCount ?? 'n/a'}`,
      `Threshold: ${notification.threshold ?? 'n/a'}`,
      `Window Seconds: ${notification.windowSeconds ?? 'n/a'}`,
      `Cooldown Seconds: ${notification.cooldownSeconds ?? 'n/a'}`,
    ].join('\n');
  }
}
