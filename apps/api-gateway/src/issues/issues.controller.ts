import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { IssuesService } from './issues.service';

@Controller('issues')
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  async listIssues(@Req() request: { user?: JwtUser }) {
    return {
      issues: await this.issuesService.listIssues(request.user!.projectIds),
    };
  }

  @Post('grouping/run')
  async runGrouping() {
    return this.issuesService.runGrouping();
  }

  @Post('clear-today')
  async clearTodayIssues(@Req() request: { user?: JwtUser }) {
    return this.issuesService.clearTodayIssues(request.user!.projectIds);
  }

  @Get('grouping/current')
  async getCurrentGrouping(@Req() request: { user?: JwtUser }) {
    return this.issuesService.getCurrentGrouping(request.user!.projectIds);
  }

  @Get(':id')
  async getIssueDetail(
    @Param('id') issueId: string,
    @Req() request: { user?: JwtUser },
  ) {
    return this.issuesService.getIssueDetail(issueId, request.user!.projectIds);
  }

  @Post(':id/analysis')
  async analyzeIssue(
    @Param('id') issueId: string,
    @Req() request: { user?: JwtUser },
  ) {
    return this.issuesService.analyzeIssue(issueId, request.user!.projectIds);
  }
}
