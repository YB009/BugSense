import { Module } from '@nestjs/common';
import { AlertWorkerModule } from './bull/alert-worker.module';
import { IssuesModule } from './issues/issues.module';
import { RulesModule } from './rules/rules.module';

@Module({
  imports: [AlertWorkerModule, RulesModule, IssuesModule],
})
export class AppModule {}
