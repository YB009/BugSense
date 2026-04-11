import { Module } from '@nestjs/common';
import { AlertQueueModule } from './bull/alert-queue.module';
import { ClickHouseModule } from './clickhouse/clickhouse.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [AlertQueueModule, ClickHouseModule, EventsModule],
})
export class AppModule {}
