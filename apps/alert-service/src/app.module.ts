import { Module } from '@nestjs/common';
import { AlertWorkerModule } from './bull/alert-worker.module';
import { RulesModule } from './rules/rules.module';

@Module({
  imports: [AlertWorkerModule, RulesModule],
})
export class AppModule {}
