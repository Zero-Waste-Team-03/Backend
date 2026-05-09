import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
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
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPE } from '../notifications/enums/notification-type.enum';
import { Queue } from 'bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { CHAT_JOBS, GAMIFICATION_JOBS } from 'src/common/constants/jobs';
import {
  Donation,
  DonationStatusValues,
} from '../donation/entities/donation.entity';
import { User } from '../user/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { MarkTransactionCompletedDto } from './v1/dto/mark-transaction-completed.dto';
import { ConversationPreviewType } from './graphql/types/conversation-preview.type';
import { throwGatewayAppError } from 'src/common/errors/throw-app-error';

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
    private readonly notificationsService: NotificationsService,
    @InjectQueue(QUEUE_NAME.CHAT)
    private readonly chatQueue: Queue,
    @InjectQueue(QUEUE_NAME.GAMIFICATION)
    private readonly gamificationQueue: Queue,
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

  async getMyActiveConversations(
    requesterId: string,
  ): Promise<ConversationPreviewType[]> {
    const rows = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        Reservation,
        'reservation',
        'reservation.id = conversation.reservationId',
      )
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .leftJoin('donation.photos', 'donationPhoto', 'donationPhoto.isMain = true')
      .leftJoin('donationPhoto.attachment', 'donationAttachment')
      .where(
        '(reservation.beneficiaryId = :requesterId OR donation.userId = :requesterId)',
        { requesterId },
      )
      .andWhere('conversation.status = :status', {
        status: ConversationStatusValues.ACTIVE,
      })
      .select([
        'conversation.id AS id',
        'conversation."reservationId" AS "reservationId"',
        'conversation."lastMessage" AS "lastMessage"',
        'conversation.status AS "status"',
        'conversation."createdAt" AS "createdAt"',
        'reservation."beneficiaryId" AS "beneficiaryId"',
        'donation."userId" AS "donorId"',
        'donation.title AS "donationTitle"',
        'donationAttachment.url AS "donationImageUrl"',
      ])
      .orderBy('conversation.createdAt', 'DESC')

      .getRawMany<{
        id: string;
        reservationId: string;
        lastMessage: string | null;
        status: ConversationStatus;
        createdAt: Date;
        beneficiaryId: string;
        donorId: string;
        donationTitle: string | null;
        donationImageUrl: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      reservationId: row.reservationId,
      lastMessage: row.lastMessage,
      status: row.status,
      createdAt: row.createdAt,
      counterpartUserId:
        row.beneficiaryId === requesterId ? row.donorId : row.beneficiaryId,
      donationTitle: row.donationTitle,
      donationImageUrl: row.donationImageUrl,
      counterpart: {
        displayName: '',
        avatarUrl: null,
        isOnline: false,
      },
    }));
  }

  async getMyArchivedConversations(
    requesterId: string,
    pagination?: PaginationInput,
  ): Promise<{
    items: ConversationPreviewType[];
    totalCount: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const baseQuery = () =>
      this.conversationRepository
        .createQueryBuilder('conversation')
        .innerJoin(
          Reservation,
          'reservation',
          'reservation.id = conversation.reservationId',
        )
        .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
        .where(
          '(reservation.beneficiaryId = :requesterId OR donation.userId = :requesterId)',
          { requesterId },
        )
        .andWhere('conversation.status = :status', {
          status: ConversationStatusValues.ARCHIVED,
        });

    const totalCount = await baseQuery().getCount();

    const rows = await baseQuery()
      .leftJoin('donation.photos', 'donationPhoto', 'donationPhoto.isMain = true')
      .leftJoin('donationPhoto.attachment', 'donationAttachment')
      .addSelect((qb) =>
        qb
          .select('MAX(message."createdAt")')
          .from(Message, 'message')
          .where('message."conversationId" = conversation.id'),
        'lastMessageAt',
      )
      .select([
        'conversation.id AS id',
        'conversation."reservationId" AS "reservationId"',
        'conversation."lastMessage" AS "lastMessage"',
        'conversation.status AS "status"',
        'conversation."createdAt" AS "createdAt"',
        'reservation."beneficiaryId" AS "beneficiaryId"',
        'donation."userId" AS "donorId"',
        'donation.title AS "donationTitle"',
        'donationAttachment.url AS "donationImageUrl"',
      ])
      .orderBy('"lastMessageAt"', 'DESC', 'NULLS LAST')
      .addOrderBy('conversation."createdAt"', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany<{
        id: string;
        reservationId: string;
        lastMessage: string | null;
        status: ConversationStatus;
        createdAt: Date;
        beneficiaryId: string;
        donorId: string;
        donationTitle: string | null;
        donationImageUrl: string | null;
      }>();

    const items = rows.map((row) => ({
      id: row.id,
      reservationId: row.reservationId,
      lastMessage: row.lastMessage,
      status: row.status,
      createdAt: row.createdAt,
      counterpartUserId:
        row.beneficiaryId === requesterId ? row.donorId : row.beneficiaryId,
      donationTitle: row.donationTitle,
      donationImageUrl: row.donationImageUrl,
      counterpart: {
        displayName: '',
        avatarUrl: null,
        isOnline: false,
      },
    }));

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async getMyArchivedConversationsCount(requesterId: string): Promise<number> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        Reservation,
        'reservation',
        'reservation.id = conversation.reservationId',
      )
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .where(
        '(reservation.beneficiaryId = :requesterId OR donation.userId = :requesterId)',
        { requesterId },
      )
      .andWhere('conversation.status = :status', {
        status: ConversationStatusValues.ARCHIVED,
      })
      .getCount();
  }

  async getConversationDetails(
    conversationId: string,
    requesterId: string,
  ): Promise<ConversationPreviewType> {
    await this.requireConversationMember(conversationId, requesterId);

    const row = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        Reservation,
        'reservation',
        'reservation.id = conversation.reservationId',
      )
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .leftJoin('donation.photos', 'donationPhoto', 'donationPhoto.isMain = true')
      .leftJoin('donationPhoto.attachment', 'donationAttachment')
      .where('conversation.id = :conversationId', { conversationId })
      .select([
        'conversation.id AS id',
        'conversation."reservationId" AS "reservationId"',
        'conversation."lastMessage" AS "lastMessage"',
        'conversation.status AS "status"',
        'conversation."createdAt" AS "createdAt"',
        'reservation."beneficiaryId" AS "beneficiaryId"',
        'donation."userId" AS "donorId"',
        'donation.title AS "donationTitle"',
        'donationAttachment.url AS "donationImageUrl"',
      ])
      .getRawOne<{
        id: string;
        reservationId: string;
        lastMessage: string | null;
        status: ConversationStatus;
        createdAt: Date;
        beneficiaryId: string;
        donorId: string;
        donationTitle: string | null;
        donationImageUrl: string | null;
      }>();

    if (!row) {
      throwGatewayAppError('CHAT_CONVERSATION_NOT_FOUND', { id: conversationId });
    }

    return {
      id: row.id,
      reservationId: row.reservationId,
      lastMessage: row.lastMessage,
      status: row.status,
      createdAt: row.createdAt,
      counterpartUserId:
        row.beneficiaryId === requesterId ? row.donorId : row.beneficiaryId,
      donationTitle: row.donationTitle,
      donationImageUrl: row.donationImageUrl,
      counterpart: {
        displayName: '',
        avatarUrl: null,
        isOnline: false,
      },
    };
  }

  async sendMessage(dto: SendMessageDto): Promise<Message> {
    const conversation = await this.requireConversationMember(
      dto.conversationId,
      dto.senderId,
    );

    if (conversation.status !== ConversationStatusValues.ACTIVE) {
      throwGatewayAppError('RESERVATION_STATUS_INVALID', {
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

    const receiverId = await this.getCounterpartUserId(
      conversation.reservationId,
      dto.senderId,
    );

    await this.notificationsService.sendNotificationWithoutSaving(
      'New chat message',
      'You have received a new message.',
      receiverId,
      NOTIFICATION_TYPE.CHAT_MESSAGE,
      {
        conversationId: conversation.id,
        messageId: saved.id,
      },
    );

    await this.chatQueue.add(
      CHAT_JOBS.MODERATE_MESSAGE,
      {
        conversationId: conversation.id,
        messageId: saved.id,
        senderId: saved.senderId,
      },
      {
        removeOnComplete: true,
      },
    );

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
      order: {createdAt: 'DESC' },
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
      throwGatewayAppError('CHAT_MESSAGE_NOT_FOUND', { id: dto.messageId });
    }

    if (
      message.senderId === dto.approverId ||
      !this.isSensitive(message.content)
    ) {
      throwGatewayAppError('CHAT_INVALID_APPROVAL', { id: dto.messageId });
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
      throwGatewayAppError('CHAT_CONVERSATION_NOT_FOUND', { id: conversationId });
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
  private getReputationIncrease(donation: Donation): number {
    return donation.category.reputationGain;
  }

  async markTransactionCompleted(
    dto: MarkTransactionCompletedDto,
  ): Promise<Conversation> {
    const conversation = await this.requireConversationMember(
      dto.conversationId,
      dto.userId,
    );

    const updatedConversation =
      await this.conversationRepository.manager.transaction(async (manager) => {
        const lockedConversation = await manager.findOne(Conversation, {
          where: { id: conversation.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lockedConversation) {
          throwGatewayAppError('CHAT_CONVERSATION_NOT_FOUND', {
            id: dto.conversationId,
          });
        }

        const reservation = await manager.findOne(Reservation, {
          where: { id: lockedConversation.reservationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!reservation) {
          throwGatewayAppError('RESERVATION_NOT_FOUND', {
            id: lockedConversation.reservationId,
            status: ReservationStatusValues.PENDING,
          });
        }

        const donation = await manager.findOne(Donation, {
          where: { id: reservation.donationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!donation) {
          throwAppError('DONATION_NOT_FOUND', { id: reservation.donationId });
        }

        const category = await manager.findOne(Category, {
          where: { id: donation.categoryId },
        });

        if (category) {
          donation.category = category;
        }

        const donorId = donation.userId;
        const beneficiaryId = reservation.beneficiaryId;

        if (
          reservation.status !== ReservationStatusValues.CONFIRMED &&
          reservation.status !== ReservationStatusValues.COMPLETED
        ) {
          throwGatewayAppError('RESERVATION_STATUS_INVALID', {
            status: reservation.status,
          });
        }

        const marker = this.getCompletionMarker(dto.userId);
        const existingMarker = await manager.findOne(Message, {
          where: {
            conversationId: lockedConversation.id,
            senderId: dto.userId,
            content: marker,
          },
        });

        if (!existingMarker) {
          const completionMessage = manager.create(Message, {
            conversationId: lockedConversation.id,
            senderId: dto.userId,
            content: marker,
            isModerated: false,
          });
          await manager.save(Message, completionMessage);
        }

        const [donorDone, beneficiaryDone] = await Promise.all([
          manager.findOne(Message, {
            where: {
              conversationId: lockedConversation.id,
              senderId: donorId,
              content: this.getCompletionMarker(donorId),
            },
          }),
          manager.findOne(Message, {
            where: {
              conversationId: lockedConversation.id,
              senderId: beneficiaryId,
              content: this.getCompletionMarker(beneficiaryId),
            },
          }),
        ]);

        if (donorDone && beneficiaryDone) {
          lockedConversation.status = ConversationStatusValues.ARCHIVED;
          lockedConversation.lastMessage = 'Transaction completed';

          if (reservation.status !== ReservationStatusValues.COMPLETED) {
            reservation.status = ReservationStatusValues.COMPLETED;
            await manager.save(Reservation, reservation);

            donation.quantity = Math.max(
              donation.quantity - reservation.quantity,
              0,
            );

            if (donation.quantity <= 0) {
              donation.status = DonationStatusValues.COMPLETED;
            } else if (donation.status !== DonationStatusValues.COMPLETED) {
              donation.status = DonationStatusValues.PUBLISHED;
            }

            await manager.save(Donation, donation);
          }
          const reputationGain = this.getReputationIncrease(donation);

          await manager
            .createQueryBuilder()
            .update(User)
            .set({ reputationScore: () => '"reputationScore" + :reputationGain' })
            .setParameter('reputationGain', reputationGain)
            .where('id IN (:...ids)', { ids: [donorId, beneficiaryId] })
            .execute();

          await this.gamificationQueue.add(
            GAMIFICATION_JOBS.EVALUATE_COMPLETION_ACHIEVEMENTS,
            {
              donorId,
              beneficiaryId,
            },
            {
              removeOnComplete: true,
            },
          );
        }

        return manager.save(Conversation, lockedConversation);
      });

    return updatedConversation;
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
      throwGatewayAppError('RESERVATION_NOT_FOUND', {
        id: reservationId,
        status: ReservationStatusValues.PENDING,
      });
    }

    const isDonor = reservation.donation?.userId === requesterId;
    const isBeneficiary = reservation.beneficiaryId === requesterId;

    if (!isDonor && !isBeneficiary) {
      throwGatewayAppError('RESERVATION_OWNERSHIP_INVALID');
    }

    return reservation;
  }

  private async getCounterpartUserId(
    reservationId: string,
    senderId: string,
  ): Promise<string> {
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

    if (reservation.beneficiaryId === senderId) {
      return reservation.donation.userId;
    }

    return reservation.beneficiaryId;
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

  private getCompletionMarker(userId: string): string {
    return `[COMPLETED_BY]:${userId}`;
  }
}
