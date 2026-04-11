import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_TOKENS } from '@bugsense/types';
import { AlertQueueModule } from '../bull/alert-queue.module';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';
import { getIngestionRuntimeConfig } from '../config/runtime-config';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.ALERT,
        useFactory: () => {
          const config = getIngestionRuntimeConfig();
          return {
            transport: Transport.TCP,
            options: {
              host: config.alertTcpHost,
              port: config.alertTcpPort,
            },
          };
        },
      },
    ]),
    AlertQueueModule,
    ClickHouseModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
