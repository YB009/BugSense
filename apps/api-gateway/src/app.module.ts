import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { IngestModule } from './ingest/ingest.module';
import { IssuesModule } from './issues/issues.module';
import { ProjectsModule } from './projects/projects.module';
import { SourcemapsModule } from './sourcemaps/sourcemaps.module';
import { SseModule } from './sse/sse.module';

@Module({
  imports: [AuthModule, IngestModule, IssuesModule, ProjectsModule, SourcemapsModule, SseModule],
})
export class AppModule {}
