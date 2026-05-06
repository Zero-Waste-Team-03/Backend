import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { AdminUserModule } from './user/admin/admin-user.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CategoryModule } from './category/category.module';
import { DonationModule } from './donation/donation.module';
import { ReservationModule } from './reservation/reservation.module';
import { ChatModule } from './chat/chat.module';
import { GamificationModule } from './gamification/gamification.module';
import { ReportingModule } from './reporting/reporting.module';
import { StatsModule } from './stats/stats.module';
import { ReservationCompletionModule } from './reservation-completion/reservation-completion.module';
import { PresenceModule } from './presence/presence.module';

@Module({
  imports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
    CategoryModule,
    DonationModule,
    ReservationModule,
    ReservationCompletionModule,
    ChatModule,
    GamificationModule,
    ReportingModule,
    StatsModule,
    PresenceModule,
  ],
  exports: [
    UserModule,
    AuthenticationModule,
    NotificationsModule,
    AdminUserModule,
    CategoryModule,
    DonationModule,
    ReservationModule,
    ReservationCompletionModule,
    ChatModule,
    GamificationModule,
    ReportingModule,
    StatsModule,
    PresenceModule,
  ],
})
export class CoreModule {}
