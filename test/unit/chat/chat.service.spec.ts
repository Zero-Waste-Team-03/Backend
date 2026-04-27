import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from 'src/core/chat/chat.service';
import { Conversation } from 'src/core/chat/entities/conversation.entity';
import { Message } from 'src/core/chat/entities/message.entity';
import {
  Reservation,
  ReservationStatusValues,
} from 'src/core/reservation/entities/reservation.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatStateMachineService } from 'src/core/chat/chat-state-machine.service';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { CHAT_JOBS } from 'src/common/constants/jobs';
import { NOTIFICATION_TYPE } from 'src/core/notifications/enums/notification-type.enum';
import {
  Donation,
  DonationStatusValues,
} from 'src/core/donation/entities/donation.entity';

describe('ChatService', () => {
  let service: ChatService;

  const conversationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const messageRepository = {
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const reservationRepository = {
    findOne: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const notificationsService = {
    sendNotificationWithoutSaving: jest.fn(),
  };

  const chatQueue = {
    add: jest.fn(),
  };

  const gamificationQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: conversationRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: messageRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationRepository,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: getQueueToken(QUEUE_NAME.CHAT),
          useValue: chatQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAME.GAMIFICATION),
          useValue: gamificationQueue,
        },
        ChatStateMachineService,
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates conversation as Active when reservation is confirmed', async () => {
    reservationRepository.findOne.mockResolvedValue({
      id: 'res-1',
      beneficiaryId: 'beneficiary-1',
      quantity: 1,
      donation: { userId: 'donor-1' },
      status: ReservationStatusValues.CONFIRMED,
    });
    conversationRepository.findOne.mockResolvedValue(null);
    conversationRepository.create.mockImplementation((payload) => payload);
    conversationRepository.save.mockImplementation(async (payload) => ({
      id: 'conv-1',
      ...payload,
      createdAt: new Date(),
    }));

    const result = await service.getOrCreateConversation('res-1', 'donor-1');

    expect(conversationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 'res-1',
        status: 'Active',
      }),
    );
    expect(result.id).toBe('conv-1');
  });

  it('blocks non participant from reading messages', async () => {
    conversationRepository.findOne.mockResolvedValue({
      id: 'conv-1',
      reservationId: 'res-1',
    });
    reservationRepository.findOne.mockResolvedValue({
      id: 'res-1',
      beneficiaryId: 'beneficiary-1',
      quantity: 1,
      donation: { userId: 'donor-1' },
      status: ReservationStatusValues.PENDING,
    });

    await expect(
      service.getMessages('conv-1', 'random-user', { page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sends message for conversation member', async () => {
    conversationRepository.findOne
      .mockResolvedValueOnce({
        id: 'conv-1',
        reservationId: 'res-1',
      })
      .mockResolvedValueOnce({
        id: 'conv-1',
        reservationId: 'res-1',
      });

    reservationRepository.findOne.mockResolvedValue({
      id: 'res-1',
      beneficiaryId: 'beneficiary-1',
      quantity: 1,
      donation: { userId: 'donor-1' },
      status: ReservationStatusValues.CONFIRMED,
    });

    messageRepository.create.mockImplementation((payload) => payload);
    messageRepository.save.mockImplementation(async (payload) => ({
      id: 'msg-1',
      ...payload,
      createdAt: new Date(),
    }));

    conversationRepository.save.mockResolvedValue(undefined);
    notificationsService.sendNotificationWithoutSaving.mockResolvedValue({
      success: true,
      message: 'ok',
    });
    chatQueue.add.mockResolvedValue(undefined);

    const result = await service.sendMessage({
      conversationId: 'conv-1',
      senderId: 'donor-1',
      content: 'hello',
    });

    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        senderId: 'donor-1',
        content: 'hello',
      }),
    );
    expect(
      notificationsService.sendNotificationWithoutSaving,
    ).toHaveBeenCalledWith(
      'New chat message',
      'You have received a new message.',
      'beneficiary-1',
      NOTIFICATION_TYPE.CHAT_MESSAGE,
      {
        conversationId: 'conv-1',
        messageId: 'msg-1',
      },
    );
    expect(chatQueue.add).toHaveBeenCalledWith(
      CHAT_JOBS.MODERATE_MESSAGE,
      {
        conversationId: 'conv-1',
        messageId: 'msg-1',
        senderId: 'donor-1',
      },
      {
        removeOnComplete: true,
      },
    );
    expect(result.id).toBe('msg-1');
  });

  it('throws when sending message to unknown conversation', async () => {
    conversationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.sendMessage({
        conversationId: 'conv-missing',
        senderId: 'donor-1',
        content: 'hello',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks sending when conversation state is not active', async () => {
    conversationRepository.findOne.mockResolvedValue({
      id: 'conv-1',
      reservationId: 'res-1',
      status: 'Locked',
    });
    reservationRepository.findOne.mockResolvedValue({
      id: 'res-1',
      beneficiaryId: 'beneficiary-1',
      quantity: 1,
      donation: { userId: 'donor-1' },
      status: ReservationStatusValues.PENDING,
    });

    await expect(
      service.sendMessage({
        conversationId: 'conv-1',
        senderId: 'donor-1',
        content: 'hello',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('masks sensitive message until recipient approves', async () => {
    conversationRepository.findOne.mockResolvedValue({
      id: 'conv-1',
      reservationId: 'res-1',
      status: 'Active',
    });
    reservationRepository.findOne.mockResolvedValue({
      id: 'res-1',
      beneficiaryId: 'beneficiary-1',
      quantity: 1,
      donation: { userId: 'donor-1' },
      status: ReservationStatusValues.CONFIRMED,
    });
    messageRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'msg-sensitive',
          conversationId: 'conv-1',
          senderId: 'donor-1',
          content: '[SENSITIVE:LOCATION] 36.7,3.2',
          isModerated: false,
          createdAt: new Date(),
        },
      ],
      1,
    ]);

    const result = await service.getMessages('conv-1', 'beneficiary-1', {
      page: 1,
      limit: 10,
    });

    expect(result.items[0].content).toBe(
      '[Sensitive details pending recipient approval]',
    );
  });

  it('reveals sensitive message after approval marker exists', async () => {
    conversationRepository.findOne.mockResolvedValue({
      id: 'conv-1',
      reservationId: 'res-1',
      status: 'Active',
    });
    reservationRepository.findOne.mockResolvedValue({
      id: 'res-1',
      beneficiaryId: 'beneficiary-1',
      quantity: 1,
      donation: { userId: 'donor-1' },
      status: ReservationStatusValues.CONFIRMED,
    });
    messageRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'msg-sensitive',
          conversationId: 'conv-1',
          senderId: 'donor-1',
          content: '[SENSITIVE:LOCATION] 36.7,3.2',
          isModerated: false,
          createdAt: new Date(),
        },
        {
          id: 'approval-1',
          conversationId: 'conv-1',
          senderId: 'beneficiary-1',
          content: '[SENSITIVE_APPROVED]:msg-sensitive:beneficiary-1',
          isModerated: false,
          createdAt: new Date(),
        },
      ],
      2,
    ]);

    const result = await service.getMessages('conv-1', 'beneficiary-1', {
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].content).toBe('[SENSITIVE:LOCATION] 36.7,3.2');
  });

  it('archives conversation and updates reputation when both mark completed', async () => {
    conversationRepository.findOne.mockResolvedValue({
      id: 'conv-1',
      reservationId: 'res-1',
      status: 'Active',
    });

    reservationRepository.findOne.mockResolvedValue({
      id: 'res-1',
      donationId: 'don-1',
      quantity: 2,
      beneficiaryId: 'beneficiary-1',
      donation: { userId: 'donor-1' },
      status: ReservationStatusValues.CONFIRMED,
    });

    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'conv-1',
          reservationId: 'res-1',
          status: 'Active',
          lastMessage: null,
        })
        .mockResolvedValueOnce({
          id: 'res-1',
          donationId: 'don-1',
          quantity: 2,
          beneficiaryId: 'beneficiary-1',
          donation: { userId: 'donor-1' },
          status: ReservationStatusValues.CONFIRMED,
        })
        .mockResolvedValueOnce({
          id: 'don-1',
          userId: 'donor-1',
          quantity: 2,
          status: DonationStatusValues.PUBLISHED,
          category: { reputationGain: 10 },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'done-donor' })
        .mockResolvedValueOnce({ id: 'done-beneficiary' }),
      create: jest.fn().mockImplementation((_: any, payload: any) => payload),
      save: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ id: 'conv-1', status: 'Archived' }),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    };

    conversationRepository.manager.transaction.mockImplementation(
      async (fn: any) => fn(manager),
    );

    const result = await service.markTransactionCompleted({
      conversationId: 'conv-1',
      userId: 'donor-1',
    });

    expect(manager.save).toHaveBeenCalledWith(
      Donation,
      expect.objectContaining({
        id: 'don-1',
        quantity: 0,
        status: DonationStatusValues.COMPLETED,
      }),
    );
    expect(result.status).toBe('Archived');
  });

  it('returns active conversations with counterpart ids', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 'conv-1',
          reservationId: 'res-1',
          lastMessage: 'hello',
          status: 'Active',
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
          beneficiaryId: 'beneficiary-1',
          donorId: 'donor-1',
        },
      ]),
    };
    conversationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getMyActiveConversations('beneficiary-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'conv-1',
        counterpartUserId: 'donor-1',
      }),
    );
  });
});
