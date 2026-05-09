import { Test, TestingModule } from '@nestjs/testing';
import { ChatResolver } from 'src/core/chat/chat.resolver';
import { ChatService } from 'src/core/chat/chat.service';

describe('ChatResolver', () => {
  let resolver: ChatResolver;
  let service: ChatService;

  const mockChatService = {
    getOrCreateConversation: jest.fn(),
    getMessages: jest.fn(),
    getMyActiveConversations: jest.fn(),
    getMyArchivedConversations: jest.fn(),
    getMyArchivedConversationsCount: jest.fn(),
    getConversationDetails: jest.fn(),
    sendMessage: jest.fn(),
    approveSensitiveMessage: jest.fn(),
    markTransactionCompleted: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatResolver,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    resolver = module.get<ChatResolver>(ChatResolver);
    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('creates or gets conversation by reservation', async () => {
    mockChatService.getOrCreateConversation.mockResolvedValue({ id: 'conv-1' });

    const result = await resolver.getOrCreateConversation('res-1', 'u-1');

    expect(service.getOrCreateConversation).toHaveBeenCalledWith(
      'res-1',
      'u-1',
    );
    expect(result).toEqual({ id: 'conv-1' });
  });

  it('sends message', async () => {
    mockChatService.sendMessage.mockResolvedValue({ id: 'msg-1' });

    const result = await resolver.sendMessage(
      { conversationId: 'conv-1', content: 'hello' },
      'u-1',
    );

    expect(service.sendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      senderId: 'u-1',
      content: 'hello',
    });
    expect(result).toEqual({ id: 'msg-1' });
  });

  it('approves sensitive message', async () => {
    mockChatService.approveSensitiveMessage.mockResolvedValue({
      id: 'approval-1',
    });

    const result = await resolver.approveSensitiveMessage(
      { conversationId: 'conv-1', messageId: 'msg-1' },
      'beneficiary-1',
    );

    expect(service.approveSensitiveMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      approverId: 'beneficiary-1',
    });
    expect(result).toEqual({ id: 'approval-1' });
  });

  it('marks transaction completed', async () => {
    mockChatService.markTransactionCompleted.mockResolvedValue({
      id: 'conv-1',
      status: 'Archived',
    });

    const result = await resolver.markTransactionCompleted(
      { conversationId: 'conv-1' },
      'u-1',
    );

    expect(service.markTransactionCompleted).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'u-1',
    });
    expect(result).toEqual({ id: 'conv-1', status: 'Archived' });
  });

  it('returns conversation details for the current user', async () => {
    const preview = {
      id: 'conv-1',
      reservationId: 'res-1',
      status: 'Active',
      createdAt: new Date(),
      counterpartUserId: 'u-2',
      counterpart: { displayName: '', avatarUrl: null, isOnline: false },
    };
    mockChatService.getConversationDetails.mockResolvedValue(preview);

    const result = await resolver.conversationDetails('conv-1', 'u-1');

    expect(service.getConversationDetails).toHaveBeenCalledWith(
      'conv-1',
      'u-1',
    );
    expect(result).toEqual(preview);
  });

  it('returns active conversation previews', async () => {
    mockChatService.getMyActiveConversations.mockResolvedValue([
      {
        id: 'conv-1',
        reservationId: 'res-1',
        status: 'Active',
        createdAt: new Date(),
        counterpartUserId: 'u-2',
        counterpart: { displayName: '', avatarUrl: null },
      },
    ]);

    const result = await resolver.myActiveConversations('u-1');

    expect(service.getMyActiveConversations).toHaveBeenCalledWith('u-1');
    expect(result).toHaveLength(1);
  });

  it('returns paginated archived conversations and forwards pagination', async () => {
    const paginated = {
      items: [],
      totalCount: 0,
      page: 2,
      limit: 5,
      hasNextPage: false,
      hasPreviousPage: true,
    };
    mockChatService.getMyArchivedConversations.mockResolvedValue(paginated);

    const pagination = { page: 2, limit: 5 };
    const result = await resolver.myArchivedConversations('u-1', pagination);

    expect(service.getMyArchivedConversations).toHaveBeenCalledWith(
      'u-1',
      pagination,
    );
    expect(result).toBe(paginated);
  });

  it('returns archived conversations count', async () => {
    mockChatService.getMyArchivedConversationsCount.mockResolvedValue(4);

    const result = await resolver.myArchivedConversationsCount('u-1');

    expect(service.getMyArchivedConversationsCount).toHaveBeenCalledWith('u-1');
    expect(result).toBe(4);
  });
});
