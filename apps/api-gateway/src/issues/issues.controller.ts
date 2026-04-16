import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { IssuesService } from './issues.service';

@Controller('issues')
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  async listIssues() {
    return {
      issues: await this.issuesService.listIssues(),
    };
  }

  @Post('grouping/run')
  async runGrouping() {
    return this.issuesService.runGrouping();
  }

  @Get('grouping/current')
  async getCurrentGrouping() {
    return this.issuesService.getCurrentGrouping();
  }

  @Get(':id')
  async getIssueDetail(@Param('id') issueId: string) {
    return this.issuesService.getIssueDetail(issueId);
  }

  @Post(':id/analysis')
  async analyzeIssue(@Param('id') issueId: string) {
    return this.issuesService.analyzeIssue(issueId);
  }
}
