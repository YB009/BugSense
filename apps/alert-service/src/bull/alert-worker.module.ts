import { Module } from '@nestjs/common';
import { NotifyService } from '../notifications/notify.service';
import { RulesEngine } from '../rules/rules.engine';
import { AlertWorkerService } from './alert-worker.service';

@Module({
  providers: [AlertWorkerService, NotifyService, RulesEngine],
})
export class AlertWorkerModule {}

