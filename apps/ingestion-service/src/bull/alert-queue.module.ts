import { Module } from '@nestjs/common';
import { AlertQueueService } from './alert-queue.service';

@Module({
  providers: [AlertQueueService],
  exports: [AlertQueueService],
})
export class AlertQueueModule {}

