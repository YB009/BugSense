import { Module } from '@nestjs/common';
import { IssuesController } from './issues.controller';
import { IssuesGroupingService } from './issues-grouping.service';
import { IssuesQueryService } from './issues-query.service';
import { IssuesStorageService } from './issues-storage.service';
import { OpenAiGroupingService } from './openai-grouping.service';

@Module({
  controllers: [IssuesController],
  providers: [
    IssuesGroupingService,
    IssuesQueryService,
    IssuesStorageService,
    OpenAiGroupingService,
  ],
  exports: [IssuesGroupingService],
})
export class IssuesModule {}
