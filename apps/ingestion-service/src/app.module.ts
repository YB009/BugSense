import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICE_TOKENS } from '@bugsense/types';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICE_TOKENS.ALERT,
        transport: Transport.TCP,
        options: {
          host: process.env.ALERT_TCP_HOST ?? '127.0.0.1',
          port: process.env.ALERT_TCP_PORT
            ? Number(process.env.ALERT_TCP_PORT)
            : 4002,
        },
      },
    ]),
    EventsModule,
  ],
})
export class AppModule {}
