import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_TOKENS } from '@bugsense/types';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.INGESTION,
        useFactory: () => {
          const config = getApiGatewayRuntimeConfig();
          return {
            transport: Transport.TCP,
            options: {
              host: config.ingestionTcpHost,
              port: config.ingestionTcpPort,
            },
          };
        },
      },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
