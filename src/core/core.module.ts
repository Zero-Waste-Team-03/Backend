import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { AdminUserModule } from './user/admin/admin-user.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CategoryModule } from './category/category.module';
import { DonationModule } from './donation/donation.module';

@Module({
  imports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
    CategoryModule,
    DonationModule,
  ],
  exports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
    CategoryModule,
    DonationModule,
  ],
})
export class CoreModule {}
