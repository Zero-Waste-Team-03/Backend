import { Module } from '@nestjs/common';
import { ReservationCompletionService } from './reservation-completion.service';
import { ReservationCompletionResolver } from './reservation-completion.resolver';
import { ReservationModule } from '../reservation/reservation.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ReservationModule, ChatModule],
  providers: [ReservationCompletionService, ReservationCompletionResolver],
})
export class ReservationCompletionModule {}
