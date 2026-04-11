import { Injectable, Logger } from '@nestjs/common';

interface AlertNotification {
  eventId: string;
  projectId: string;
  reason: string;
  message: string;
  fingerprint: string;
  receivedAt: string;
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  async sendAlert(notification: AlertNotification) {
    this.logger.warn(
      `Alert triggered for project ${notification.projectId} event ${notification.eventId}: ${notification.reason} | ${notification.message} | ${notification.fingerprint} | ${notification.receivedAt}`,
    );
  }
}

