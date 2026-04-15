import { Injectable, Logger } from '@nestjs/common';
import { GroupedIssue } from '@bugsense/types';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { getAlertRuntimeConfig } from '../config/runtime-config';

@Injectable()
export class IssuesStorageService {
  private readonly logger = new Logger(IssuesStorageService.name);
  private readonly config = getAlertRuntimeConfig();

  async saveIssues(issues: GroupedIssue[]) {
    const filePath = this.config.issuesStoragePath;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          count: issues.length,
          issues,
        },
        null,
        2,
      ),
      'utf8',
    );

    this.logger.log(`Persisted ${issues.length} grouped issues to ${filePath}`);
  }

  async loadIssues(): Promise<GroupedIssue[]> {
    try {
      const contents = await readFile(this.config.issuesStoragePath, 'utf8');
      const payload = JSON.parse(contents) as { issues?: GroupedIssue[] };
      return payload.issues ?? [];
    } catch {
      return [];
    }
  }
}
