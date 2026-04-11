import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_TOKENS } from '@bugsense/types';
import { AuthModule } from '../auth/auth.module';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

@Module({
  imports: [
    AuthModule,
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
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
