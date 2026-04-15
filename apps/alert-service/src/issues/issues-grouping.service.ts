import { Injectable, Logger } from '@nestjs/common';
import { GroupedIssue } from '@bugsense/types';
import { IssuesQueryService } from './issues-query.service';
import { IssuesStorageService } from './issues-storage.service';
import { OpenAiGroupingService } from './openai-grouping.service';

@Injectable()
export class IssuesGroupingService {
  private readonly logger = new Logger(IssuesGroupingService.name);

  constructor(
    private readonly issuesQueryService: IssuesQueryService,
    private readonly openAiGroupingService: OpenAiGroupingService,
    private readonly issuesStorageService: IssuesStorageService,
  ) {}

  async groupNightly(): Promise<GroupedIssue[]> {
    const candidates = await this.issuesQueryService.fetchGroupingCandidates(24);
    this.logger.log(`Fetched ${candidates.length} event(s) for nightly grouping`);

    const grouped = await this.openAiGroupingService.groupEvents(candidates);
    await this.issuesStorageService.saveIssues(grouped);
    return grouped;
  }
}
