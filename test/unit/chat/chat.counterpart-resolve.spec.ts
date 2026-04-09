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

  it('maps counterpart to name and avatar only using dataloaders', async () => {
    const userLoader = {
      load: jest.fn().mockResolvedValue({
        id: 'u-2',
        displayName: 'John',
        email: 'hidden@test.com',
        phoneNumber: '123',
        avatarAttachmentId: 'att-1',
      }),
    };
    const attachmentLoader = {
      load: jest.fn().mockResolvedValue({ id: 'att-1', url: 'https://img' }),
    };

    const result = await resolver.counterpart(
      {
        id: 'conv-1',
        reservationId: 'res-1',
        status: 'Active',
        createdAt: new Date(),
        counterpartUserId: 'u-2',
      } as any,
      {
        loaders: {
          userLoader,
          attachmentLoader,
        },
      } as any,
    );

    expect(userLoader.load).toHaveBeenCalledWith('u-2');
    expect(attachmentLoader.load).toHaveBeenCalledWith('att-1');
    expect(result).toEqual({
      displayName: 'John',
      avatarUrl: 'https://img',
    });
    expect((result as any).email).toBeUndefined();
    expect((result as any).phoneNumber).toBeUndefined();
  });
});
