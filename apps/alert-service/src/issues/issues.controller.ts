import { Controller, Post } from '@nestjs/common';
import { IssueGroupingRunResult } from '@bugsense/types';
import { IssuesGroupingService } from './issues-grouping.service';

@Controller('issues')
export class IssuesController {
  constructor(
    private readonly issuesGroupingService: IssuesGroupingService,
  ) {}

  @Post('grouping/run')
  async runGrouping(): Promise<IssueGroupingRunResult> {
    const issues = await this.issuesGroupingService.groupNightly();

    return {
      status: 'completed',
      groupedCount: issues.length,
      generatedAt: new Date().toISOString(),
      issues,
    };
  }
}
