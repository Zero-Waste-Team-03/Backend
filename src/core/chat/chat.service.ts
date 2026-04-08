import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { throwAppError } from 'src/common/errors';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';
import { ReservationStatusValues } from '../reservation/entities/reservation.entity';
import { SendMessageDto } from './v1/dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async getOrCreateConversation(
    reservationId: string,
    requesterId: string,
  ): Promise<Conversation> {
    const reservation = await this.requireAuthorizedReservation(
      reservationId,
      requesterId,
    );

    const existing = await this.conversationRepository.findOne({
      where: { reservationId },
    });

    if (existing) {
      return existing;
    }

    const created = this.conversationRepository.create({
      reservationId,
      status:
        reservation.status === ReservationStatusValues.CONFIRMED
          ? 'Active'
          : 'Locked',
    });

    return this.conversationRepository.save(created);
  }

  async sendMessage(dto: SendMessageDto): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: dto.conversationId },
    });

    if (!conversation) {
      throwAppError('DONATION_NOT_FOUND', { id: dto.conversationId });
    }

    await this.requireConversationMember(dto.conversationId, dto.senderId);

    const message = this.messageRepository.create({
      conversationId: dto.conversationId,
      senderId: dto.senderId,
      content: dto.content,
      isModerated: false,
    });

    const saved = await this.messageRepository.save(message);

    conversation.lastMessage = saved.content;
    await this.conversationRepository.save(conversation);

    return saved;
  }

  async getMessages(
    conversationId: string,
    requesterId: string,
    pagination?: PaginationInput,
  ) {
    await this.requireConversationMember(conversationId, requesterId);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Message> = { conversationId };
    const [items, totalCount] = await this.messageRepository.findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async requireConversationMember(
    conversationId: string,
    requesterId: string,
  ): Promise<Reservation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throwAppError('DONATION_NOT_FOUND', { id: conversationId });
    }

    const reservation = await this.requireAuthorizedReservation(
      conversation.reservationId,
      requesterId,
    );

    return reservation;
  }

  private async requireAuthorizedReservation(
    reservationId: string,
    requesterId: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ['donation'],
    });

    if (!reservation) {
      throwAppError('RESERVATION_NOT_FOUND', {
        id: reservationId,
        status: ReservationStatusValues.PENDING,
      });
    }

    const isDonor = reservation.donation?.userId === requesterId;
    const isBeneficiary = reservation.beneficiaryId === requesterId;

    if (!isDonor && !isBeneficiary) {
      throwAppError('RESERVATION_OWNERSHIP_INVALID');
    }

    return reservation;
  }
}
