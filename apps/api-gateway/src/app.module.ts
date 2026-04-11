import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { IngestModule } from './ingest/ingest.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [AuthModule, IngestModule, ProjectsModule],
})
export class AppModule {}
