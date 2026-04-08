import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from 'src/core/chat/chat.service';
import { Conversation } from 'src/core/chat/entities/conversation.entity';
import { Message } from 'src/core/chat/entities/message.entity';
import {
  Reservation,
  ReservationStatusValues,
} from 'src/core/reservation/entities/reservation.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;

  const conversationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const messageRepository = {
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const reservationRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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
});
