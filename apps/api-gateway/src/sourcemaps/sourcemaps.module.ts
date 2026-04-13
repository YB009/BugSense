import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_TOKENS } from '@bugsense/types';
import { AuthModule } from '../auth/auth.module';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';
import { SourcemapsController } from './sourcemaps.controller';
import { SourcemapsService } from './sourcemaps.service';

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
  controllers: [SourcemapsController],
  providers: [SourcemapsService],
})
export class SourcemapsModule {}
