import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from 'src/core/chat/chat.gateway';
import { ChatService } from 'src/core/chat/chat.service';
import { UserService } from 'src/core/user/v1/user.service';
import { JwtService } from '@nestjs/jwt';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockChatService = {
    sendMessage: jest.fn(),
    approveSensitiveMessage: jest.fn(),
    markTransactionCompleted: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: UserService,
          useValue: { findById: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('acknowledges join conversation', async () => {
    const client = {
      user: { id: 'u-1' },
      join: jest.fn(),
    } as any;

    await gateway.handleJoinConversation(
      client,
      { conversationId: 'conv-1' },
    );

    expect(client.join).toHaveBeenCalledWith('conversation_conv-1');
      });

  it('acknowledges send message', async () => {
    const client = {
      user: { id: 'u-1' },
    } as any;
    mockChatService.sendMessage.mockResolvedValue({ id: 'msg-1' });

    await gateway.handleSendMessage(
      client,
      { conversationId: 'conv-1', content: 'hello' },
    );

    expect(mockChatService.sendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      senderId: 'u-1',
      content: 'hello',
    });
      });

  it('acknowledges mark transaction completed', async () => {
    const client = {
      user: { id: 'u-1' },
    } as any;
    mockChatService.markTransactionCompleted.mockResolvedValue({
      id: 'conv-1',
      status: 'Archived',
    });

    await gateway.handleMarkTransactionCompleted(
      client,
      { conversationId: 'conv-1' },
    );

    expect(mockChatService.markTransactionCompleted).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'u-1',
    });
      });
});
