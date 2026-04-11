import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AlertEvaluationJob, BULL_JOBS, BULL_QUEUES } from '@bugsense/types';
import { Queue } from 'bullmq';
import { getIngestionRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class AlertQueueService implements OnModuleDestroy {
  private readonly config = getIngestionRuntimeConfig();

  private readonly queue = new Queue<AlertEvaluationJob>(BULL_QUEUES.ALERTS, {
    connection: this.config.redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  async enqueueAlertEvaluation(payload: AlertEvaluationJob) {
    await this.queue.add(BULL_JOBS.EVALUATE_ALERT, payload);
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}

