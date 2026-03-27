import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './entities/token.entity';
import { Notification } from './entities/notification.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Token, Notification]),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [NotificationsService, NotificationsResolver],
  exports: [NotificationsService],
})
export class NotificationsModule {}
