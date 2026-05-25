import { RedisService } from 'nestjs-redis-client';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from 'src/core/chat/chat.gateway';
import { ChatService } from 'src/core/chat/chat.service';
import { UserService } from 'src/core/user/v1/user.service';
import { JwtService } from '@nestjs/jwt';
import { PresenceService } from 'src/core/presence/presence.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockChatService = {
    sendMessage: jest.fn(),
    approveSensitiveMessage: jest.fn(),
    markTransactionCompleted: jest.fn(),
  };

  const userService = { findById: jest.fn() };
  const jwtService = { verifyAsync: jest.fn() };
  const presenceService = {
    markOnline: jest.fn().mockResolvedValue(undefined),
    markOffline: jest.fn().mockResolvedValue(undefined),
    heartbeat: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: PresenceService,
          useValue: presenceService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('acknowledges join conversation', async () => {
    const emit = jest.fn();
    const client = {
      user: { id: 'u-1' },
      join: jest.fn(),
      to: jest.fn().mockReturnValue({ emit }),
    } as any;

    await gateway.handleJoinConversation(client, { conversationId: 'conv-1' });

    expect(client.join).toHaveBeenCalledWith('conversation_conv-1');
    expect(client.to).toHaveBeenCalledWith('conversation_conv-1');
    expect(emit).toHaveBeenCalledWith('chat:conversation-joined', {
      conversationId: 'conv-1',
      userId: 'u-1',
    });
  });

  it('acknowledges send message', async () => {
    const emit = jest.fn();
    const client = {
      user: { id: 'u-1' },
      to: jest.fn().mockReturnValue({ emit }),
    } as any;
    mockChatService.sendMessage.mockResolvedValue({ id: 'msg-1' });

    await gateway.handleSendMessage(client, {
      conversationId: 'conv-1',
      content: 'hello',
    });

    expect(mockChatService.sendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      senderId: 'u-1',
      content: 'hello',
    });
    expect(client.to).toHaveBeenCalledWith('conversation_conv-1');
    expect(emit).toHaveBeenCalledWith('chat:message-created', { id: 'msg-1' });
  });

  it('marks user online and starts heartbeat on successful connection', async () => {
    jest.useFakeTimers();
    jwtService.verifyAsync.mockResolvedValue({ id: 'u-1' });
    userService.findById.mockResolvedValue({
      id: 'u-1',
      email: 'a@b.c',
      role: 'user',
      resetVersion: 0,
    });

    const client = {
      id: 'sock-A',
      handshake: { auth: { token: 'Bearer t' }, headers: {} },
      data: {} as Record<string, unknown>,
      join: jest.fn(),
      disconnect: jest.fn(),
      rooms: new Set<string>(),
    } as any;

    await gateway.handleConnection(client);

    expect(presenceService.markOnline).toHaveBeenCalledWith('u-1', 'sock-A');
    expect(client.data.presenceHeartbeat).toBeDefined();

    presenceService.heartbeat.mockClear();
    jest.advanceTimersByTime(PresenceService.HEARTBEAT_MS);
    expect(presenceService.heartbeat).toHaveBeenCalledWith('u-1', 'sock-A');

    clearInterval(client.data.presenceHeartbeat as NodeJS.Timeout);
    jest.useRealTimers();
  });

  it('marks user offline on disconnect and clears heartbeat', async () => {
    const heartbeat = setInterval(() => undefined, 1_000_000);
    const client = {
      id: 'sock-A',
      user: { id: 'u-1' },
      data: { presenceHeartbeat: heartbeat },
      rooms: new Set<string>(),
    } as any;

    await gateway.handleDisconnect(client);

    expect(presenceService.markOffline).toHaveBeenCalledWith('u-1', 'sock-A');
    expect(client.data.presenceHeartbeat).toBeUndefined();
  });

  it('skips presence cleanup on unauthenticated disconnect', async () => {
    const client = {
      id: 'sock-A',
      data: {},
      rooms: new Set<string>(),
    } as any;

    await gateway.handleDisconnect(client);

    expect(presenceService.markOffline).not.toHaveBeenCalled();
  });

  it('acknowledges mark transaction completed', async () => {
    const emit = jest.fn();
    const client = {
      user: { id: 'u-1' },
      to: jest.fn().mockReturnValue({ emit }),
    } as any;
    mockChatService.markTransactionCompleted.mockResolvedValue({
      id: 'conv-1',
      status: 'Archived',
    });

    await gateway.handleMarkTransactionCompleted(client, {
      conversationId: 'conv-1',
    });

    expect(mockChatService.markTransactionCompleted).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'u-1',
    });
    expect(client.to).toHaveBeenCalledWith('conversation_conv-1');
    expect(emit).toHaveBeenCalledWith('chat:transaction-completed', {
      conversationId: 'conv-1',
      status: 'Archived',
    });
  });
});
