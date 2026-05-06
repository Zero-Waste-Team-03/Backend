import { Test, TestingModule } from '@nestjs/testing';
import { ChatResolver } from 'src/core/chat/chat.resolver';
import { ChatService } from 'src/core/chat/chat.service';

describe('ChatResolver counterpart resolve', () => {
  let resolver: ChatResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatResolver,
        {
          provide: ChatService,
          useValue: {
            getOrCreateConversation: jest.fn(),
            getMessages: jest.fn(),
            getMyActiveConversations: jest.fn(),
            sendMessage: jest.fn(),
            approveSensitiveMessage: jest.fn(),
            markTransactionCompleted: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<ChatResolver>(ChatResolver);
  });

  it('maps counterpart to name, avatar and online status using dataloaders', async () => {
    const userLoader = {
      load: jest.fn().mockResolvedValue({
        id: 'u-2',
        displayName: 'John',
        email: 'hidden@test.com',
        phoneNumber: '123',
        avatarAttachmentId: 'att-1',
      }),
    };
    const presenceLoader = {
      load: jest.fn().mockResolvedValue(true),
    };
    const result = await resolver.counterpart(
      {
        id: 'conv-1',
        reservationId: 'res-1',
        status: 'Active',
        createdAt: new Date(),
        counterpartUserId: 'u-2',
        donationImageUrl: 'https://img',
      } as any,
      {
        loaders: {
          userLoader,
          presenceLoader,
        },
      } as any,
    );

    expect(userLoader.load).toHaveBeenCalledWith('u-2');
    expect(presenceLoader.load).toHaveBeenCalledWith('u-2');
    expect(result).toEqual({
      displayName: 'John',
      avatarUrl: 'https://img',
      isOnline: true,
    });
    expect((result as any).email).toBeUndefined();
    expect((result as any).phoneNumber).toBeUndefined();
  });

  it('reports offline counterpart when presence loader returns false', async () => {
    const userLoader = {
      load: jest.fn().mockResolvedValue({ id: 'u-2', displayName: 'Jane' }),
    };
    const presenceLoader = {
      load: jest.fn().mockResolvedValue(false),
    };

    const result = await resolver.counterpart(
      {
        id: 'conv-1',
        counterpartUserId: 'u-2',
        donationTitle: 'Bread',
        donationImageUrl: null,
      } as any,
      {
        loaders: { userLoader, presenceLoader },
      } as any,
    );

    expect(result).toEqual({
      displayName: 'Jane (Bread)',
      avatarUrl: null,
      isOnline: false,
    });
  });
});
