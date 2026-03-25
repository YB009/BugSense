import { Module } from '@nestjs/common';
import { RulesModule } from './rules/rules.module';

@Module({
  imports: [RulesModule],
})
export class AppModule {}

