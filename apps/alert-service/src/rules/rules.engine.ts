import { Injectable } from '@nestjs/common';
import { AlertEvaluationJob } from '@bugsense/types';

@Injectable()
export class RulesEngine {
  evaluate(job: AlertEvaluationJob) {
    if (job.level === 'error') {
      return {
        shouldTrigger: true,
        reason: 'Error-level event queued for alert review',
      };
    }

    return {
      shouldTrigger: false,
      reason: `Level ${job.level} does not trigger alerts`,
    };
  }
}

