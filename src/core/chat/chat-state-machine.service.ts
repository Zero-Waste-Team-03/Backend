import { Injectable } from '@nestjs/common';
import {
  Conversation,
  ConversationStatusValues,
} from './entities/conversation.entity';
import { ReservationStatusValues } from '../reservation/entities/reservation.entity';

@Injectable()
export class ChatStateMachineService {
  syncWithReservationStatus(
    conversation: Conversation,
    reservationStatus: string,
  ): Conversation {
    if (
      reservationStatus === ReservationStatusValues.CANCELLED ||
      reservationStatus === ReservationStatusValues.COMPLETED
    ) {
      conversation.status = ConversationStatusValues.ARCHIVED;
      return conversation;
    }

    if (reservationStatus === ReservationStatusValues.CONFIRMED) {
      conversation.status = ConversationStatusValues.ACTIVE;
      return conversation;
    }

    conversation.status = ConversationStatusValues.LOCKED;
    return conversation;
  }
}
