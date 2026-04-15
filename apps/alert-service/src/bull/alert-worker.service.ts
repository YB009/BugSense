import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AlertEvaluationJob, BULL_JOBS, BULL_QUEUES } from '@bugsense/types';
import { Job, Queue, Worker } from 'bullmq';
import { NotifyService } from '../notifications/notify.service';
import { getAlertRuntimeConfig } from '../config/runtime-config';
import { IssuesGroupingService } from '../issues/issues-grouping.service';
import { RulesEngine } from '../rules/rules.engine';

@Injectable()
export class AlertWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertWorkerService.name);
  private readonly config = getAlertRuntimeConfig();
  private worker?: Worker<AlertEvaluationJob>;
  private queue?: Queue;

  constructor(
    private readonly rulesEngine: RulesEngine,
    private readonly notifyService: NotifyService,
    private readonly issuesGroupingService: IssuesGroupingService,
  ) {}

  async onModuleInit() {
    this.queue = new Queue(BULL_QUEUES.ALERTS, {
      connection: this.config.redisConnection,
    });

    await this.queue.upsertJobScheduler(
      BULL_JOBS.GROUP_ISSUES_NIGHTLY,
      {
        pattern: '0 2 * * *',
      },
      {
        name: BULL_JOBS.GROUP_ISSUES_NIGHTLY,
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: 20,
        },
      },
    );

    this.worker = new Worker<AlertEvaluationJob>(
      BULL_QUEUES.ALERTS,
      async (job) => this.process(job),
      {
        connection: this.config.redisConnection,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Processed alert job ${job.id}`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Alert job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async process(job: Job<AlertEvaluationJob>) {
    if (job.name === BULL_JOBS.GROUP_ISSUES_NIGHTLY) {
      const groupedIssues = await this.issuesGroupingService.groupNightly();
      this.logger.log(`Nightly AI grouping produced ${groupedIssues.length} issue(s)`);
      return {
        groupedIssues: groupedIssues.length,
      };
    }

    if (job.name === BULL_JOBS.EVALUATE_ALERT) {
      const evaluation = await this.rulesEngine.evaluate(job.data);
      if (!evaluation.shouldTrigger) {
        this.logger.debug(
          `No alert triggered for event ${job.data.eventId} (${evaluation.reason})`,
        );
        return evaluation;
      }

      await this.notifyService.sendAlert({
        eventId: job.data.eventId,
        projectId: job.data.projectId,
        reason: evaluation.reason,
        message: job.data.message,
        fingerprint: job.data.issueFingerprint,
        receivedAt: job.data.receivedAt,
        currentCount: evaluation.currentCount,
        threshold: evaluation.threshold,
        windowSeconds: evaluation.windowSeconds,
        cooldownSeconds: evaluation.cooldownSeconds,
      });

      return evaluation;
    }

    this.logger.warn(`Ignoring unsupported job ${job.name}`);
    return;
  }
}
