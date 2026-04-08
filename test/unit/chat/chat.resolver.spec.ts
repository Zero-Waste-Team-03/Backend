import { Test, TestingModule } from '@nestjs/testing';
import { ChatResolver } from 'src/core/chat/chat.resolver';
import { ChatService } from 'src/core/chat/chat.service';

describe('ChatResolver', () => {
  let resolver: ChatResolver;
  let service: ChatService;

  const mockChatService = {
    getOrCreateConversation: jest.fn(),
    getMessages: jest.fn(),
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
});
