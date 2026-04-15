import { Module } from '@nestjs/common';
import { IssuesModule } from '../issues/issues.module';
import { NotifyService } from '../notifications/notify.service';
import { RulesEngine } from '../rules/rules.engine';
import { AlertWorkerService } from './alert-worker.service';

@Module({
  imports: [IssuesModule],
  providers: [AlertWorkerService, NotifyService, RulesEngine],
})
export class AlertWorkerModule {}
