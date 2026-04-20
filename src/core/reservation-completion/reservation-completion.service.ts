import { Injectable } from '@nestjs/common';
import { Reservation } from '../reservation/entities/reservation.entity';
import { ReservationService } from '../reservation/reservation.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class ReservationCompletionService {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly chatService: ChatService,
  ) {}

  async confirmReservationCompleted(
    reservationId: string,
    userId: string,
  ): Promise<Reservation> {
    await this.reservationService.findMyReservationById(reservationId, userId);

    const conversation = await this.chatService.getOrCreateConversation(
      reservationId,
      userId,
    );

    await this.chatService.markTransactionCompleted({
      conversationId: conversation.id,
      userId,
    });

    return this.reservationService.findMyReservationById(reservationId, userId);
  }
}
