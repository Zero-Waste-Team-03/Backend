import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { AdminUserModule } from './user/admin/admin-user.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CategoryModule } from './category/category.module';
import { DonationModule } from './donation/donation.module';
import { ReservationModule } from './reservation/reservation.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
    CategoryModule,
    DonationModule,
    ReservationModule,
    ChatModule,
  ],
  exports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
    CategoryModule,
    DonationModule,
    ReservationModule,
    ChatModule,
  ],
})
export class CoreModule {}
