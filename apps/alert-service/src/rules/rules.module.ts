import { Module } from '@nestjs/common';
import { RulesController } from './rules.controller';
import { RulesEngine } from './rules.engine';
import { RulesService } from './rules.service';

@Module({
  controllers: [RulesController],
  providers: [RulesEngine, RulesService],
  exports: [RulesEngine],
})
export class RulesModule {}
