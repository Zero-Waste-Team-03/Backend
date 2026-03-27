import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { AdminUserModule } from './user/admin/admin-user.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
  ],
  exports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
  ],
})
export class CoreModule {}
