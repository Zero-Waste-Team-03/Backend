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
import {
  ConversationStatus,
  ConversationStatusValues,
} from './entities/conversation.entity';
import { ChatStateMachineService } from './chat-state-machine.service';
import {
  CHAT_SENSITIVE_MARKERS,
  SENSITIVE_PENDING_PLACEHOLDER,
} from './constants/chat-sensitive-markers';
import { ApproveSensitiveMessageDto } from './v1/dto/approve-sensitive-message.dto';

const SENSITIVE_APPROVED_PREFIX = '[SENSITIVE_APPROVED]';

type ApprovalMarker = {
  messageId: string;
  approverId: string;
};

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly chatStateMachineService: ChatStateMachineService,
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
      status: ConversationStatusValues.LOCKED,
    });

    this.chatStateMachineService.syncWithReservationStatus(
      created,
      reservation.status,
    );

    return this.conversationRepository.save(created);
  }

  async sendMessage(dto: SendMessageDto): Promise<Message> {
    const conversation = await this.requireConversationMember(
      dto.conversationId,
      dto.senderId,
    );

    if (conversation.status !== ConversationStatusValues.ACTIVE) {
      throwAppError('RESERVATION_STATUS_INVALID', {
        status: conversation.status,
      });
    }

    const message = this.messageRepository.create({
      conversationId: dto.conversationId,
      senderId: dto.senderId,
      content: this.buildStoredMessageContent(dto.content),
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

    const approvals = items
      .filter((item) => this.isApprovalMarker(item.content))
      .map((item) => this.parseApprovalMarker(item.content))
      .filter((item): item is ApprovalMarker => item !== null);

    const approvedMessageIdsForViewer = new Set(
      approvals
        .filter((approval) => approval.approverId === requesterId)
        .map((approval) => approval.messageId),
    );

    const visibleItems = items
      .filter((item) => !this.isApprovalMarker(item.content))
      .map((item) =>
        this.mapMessageForViewer(
          item,
          requesterId,
          approvedMessageIdsForViewer,
        ),
      );

    return {
      items: visibleItems,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async approveSensitiveMessage(
    dto: ApproveSensitiveMessageDto,
  ): Promise<Message> {
    const conversation = await this.requireConversationMember(
      dto.conversationId,
      dto.approverId,
    );

    const message = await this.messageRepository.findOne({
      where: {
        id: dto.messageId,
        conversationId: dto.conversationId,
      },
    });

    if (!message) {
      throwAppError('CHAT_MESSAGE_NOT_FOUND', { id: dto.messageId });
    }

    if (
      message.senderId === dto.approverId ||
      !this.isSensitive(message.content)
    ) {
      throwAppError('CHAT_INVALID_APPROVAL', { id: dto.messageId });
    }

    const marker = `${SENSITIVE_APPROVED_PREFIX}:${message.id}:${dto.approverId}`;
    const approvalMessage = this.messageRepository.create({
      conversationId: conversation.id,
      senderId: dto.approverId,
      content: marker,
      isModerated: false,
    });

    return this.messageRepository.save(approvalMessage);
  }

  async requireConversationMember(
    conversationId: string,
    requesterId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throwAppError('CHAT_CONVERSATION_NOT_FOUND', { id: conversationId });
    }

    const reservation = await this.requireAuthorizedReservation(
      conversation.reservationId,
      requesterId,
    );

    const previousStatus = conversation.status;
    this.chatStateMachineService.syncWithReservationStatus(
      conversation,
      reservation.status,
    );

    if (previousStatus !== conversation.status) {
      await this.conversationRepository.save(conversation);
    }

    return conversation;
  }

  async getConversationStatus(
    conversationId: string,
    requesterId: string,
  ): Promise<ConversationStatus> {
    const conversation = await this.requireConversationMember(
      conversationId,
      requesterId,
    );
    return conversation.status;
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

  private buildStoredMessageContent(content: string): string {
    return content.trim();
  }

  private isSensitive(content: string): boolean {
    return CHAT_SENSITIVE_MARKERS.some((marker) => content.includes(marker));
  }

  private isApprovalMarker(content: string): boolean {
    return content.startsWith(SENSITIVE_APPROVED_PREFIX);
  }

  private mapMessageForViewer(
    message: Message,
    viewerId: string,
    approvedMessageIds: Set<string>,
  ): Message {
    if (this.isApprovalMarker(message.content)) {
      return { ...message, content: '' } as Message;
    }

    if (!this.isSensitive(message.content) || message.senderId === viewerId) {
      return message;
    }

    if (approvedMessageIds.has(message.id)) {
      return message;
    }

    return { ...message, content: SENSITIVE_PENDING_PLACEHOLDER } as Message;
  }

  private parseApprovalMarker(content: string): ApprovalMarker | null {
    const [, messageId, approverId] = content.split(':');
    if (!messageId || !approverId) {
      return null;
    }

    return {
      messageId,
      approverId,
    };
  }
}
