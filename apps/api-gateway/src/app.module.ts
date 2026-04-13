import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { IngestModule } from './ingest/ingest.module';
import { ProjectsModule } from './projects/projects.module';
import { SourcemapsModule } from './sourcemaps/sourcemaps.module';
import { SseModule } from './sse/sse.module';

@Module({
  imports: [AuthModule, IngestModule, ProjectsModule, SourcemapsModule, SseModule],
})
export class AppModule {}
