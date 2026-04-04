import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_TOKENS } from '@bugsense/types';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICE_TOKENS.INGESTION,
        transport: Transport.TCP,
        options: {
          host: process.env.INGESTION_TCP_HOST ?? '127.0.0.1',
          port: process.env.INGESTION_TCP_PORT
            ? Number(process.env.INGESTION_TCP_PORT)
            : 4001,
        },
      },
    ]),
    ProjectsModule,
  ],
})
export class AppModule {}
