import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [UserModule, AuthenticationModule, NotificationsModule],
  exports: [UserModule, AuthenticationModule, NotificationsModule],
})
export class CoreModule {}
