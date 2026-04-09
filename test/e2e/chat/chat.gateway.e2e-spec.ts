import { INestApplication, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GraphQLModule,
  Mutation,
  Query,
  ObjectType,
  Field,
  Args,
  ID,
  Resolver,
} from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JwtService } from '@nestjs/jwt';
import { io, Socket } from 'socket.io-client';
import { AccessTokenGuard } from 'src/core/authentication/guards/access-token.guard';
import { CHAT_SUBSCRIBED_EVENTS } from 'src/core/chat/constants/chat-ws-events';
import { CHAT_EMITTED_EVENTS } from 'src/core/chat/constants/chat-ws-events';
import { ChatGateway } from 'src/core/chat/chat.gateway';
import { ChatService } from 'src/core/chat/chat.service';
import { ChatConversationMemberGuard } from 'src/core/chat/guards/chat-conversation-member.guard';
import { ChatConversationWritableGuard } from 'src/core/chat/guards/chat-conversation-writable.guard';
import { UserService } from 'src/core/user/v1/user.service';

@ObjectType('ChatMessageE2e')
class ChatMessageE2eType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  conversationId: string;

  @Field(() => ID)
  senderId: string;

  @Field(() => String)
  content: string;
}

@ObjectType('ConversationE2e')
class ConversationE2eType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  status: string;
}

@Resolver()
class ChatGatewayE2eResolver {
  constructor(private readonly chatService: ChatService) {}

  @Query(() => String)
  health(): string {
    return 'ok';
  }

  @UseGuards(
    AccessTokenGuard,
    ChatConversationMemberGuard,
    ChatConversationWritableGuard,
  )
  @Mutation(() => ChatMessageE2eType)
  async sendMessage(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @Args('content', { type: () => String }) content: string,
  ): Promise<ChatMessageE2eType> {
    return this.chatService.sendMessage({
      conversationId,
      senderId: 'user-1',
      content,
    }) as unknown as ChatMessageE2eType;
  }

  @UseGuards(AccessTokenGuard, ChatConversationMemberGuard)
  @Mutation(() => ConversationE2eType)
  async markTransactionCompleted(
    @Args('conversationId', { type: () => ID }) conversationId: string,
  ): Promise<ConversationE2eType> {
    return this.chatService.markTransactionCompleted({
      conversationId,
      userId: 'user-1',
    }) as unknown as ConversationE2eType;
  }
}

describe('ChatGateway (e2e)', () => {
  let app: INestApplication;
  let client: Socket;
  let baseUrl: string;

  const mockChatService = {
    requireConversationMember: jest.fn(),
    getConversationStatus: jest.fn(),
    sendMessage: jest.fn(),
    approveSensitiveMessage: jest.fn(),
    markTransactionCompleted: jest.fn(),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          path: '/graphql',
        }),
      ],
      providers: [
        ChatGateway,
        ChatGatewayE2eResolver,
        ChatConversationMemberGuard,
        ChatConversationWritableGuard,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    const address = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    mockJwtService.verifyAsync.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      role: 'User',
      resetVersion: 0,
    });
    mockUserService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      role: 'User',
      resetVersion: 0,
    });

    mockChatService.requireConversationMember.mockResolvedValue({
      id: 'conv-1',
      status: 'Active',
    });
    mockChatService.getConversationStatus.mockResolvedValue('Active');
    mockChatService.sendMessage.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'hello',
      isModerated: false,
      createdAt: new Date(),
    });
    mockChatService.markTransactionCompleted.mockResolvedValue({
      id: 'conv-1',
      status: 'Archived',
    });
  });

  afterEach(() => {
    if (client && client.connected) {
      client.disconnect();
    }
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (client) {
      client.disconnect();
    }
    await app.close();
  });

  async function connectClient(): Promise<Socket> {
    return await new Promise((resolve, reject) => {
      const socket = io(`${baseUrl}/chat`, {
        transports: ['websocket'],
        auth: {
          token: 'Bearer test-token',
        },
      });

      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (error) => reject(error));
    });
  }

  it('acknowledges join conversation with room name', async () => {
    mockChatService.requireConversationMember.mockResolvedValue({
      id: 'conv-1',
      status: 'Active',
    });

    client = await connectClient();

    const joined = await new Promise<{
      conversationId: string;
      userId: string;
    }>((resolve) => {
      client.once(CHAT_EMITTED_EVENTS.CONVERSATION_JOINED, resolve);
      client.emit(CHAT_SUBSCRIBED_EVENTS.JOIN_CONVERSATION, {
        conversationId: 'conv-1',
      });
    });

    expect(joined).toEqual({ conversationId: 'conv-1', userId: 'user-1' });
    expect(mockChatService.requireConversationMember).toHaveBeenCalledWith(
      'conv-1',
      'user-1',
    );
  });

  it('acknowledges send message event', async () => {
    client = await connectClient();

    await new Promise<void>((resolve) => {
      client.once(CHAT_EMITTED_EVENTS.CONVERSATION_JOINED, () => resolve());
      client.emit(CHAT_SUBSCRIBED_EVENTS.JOIN_CONVERSATION, {
        conversationId: 'conv-1',
      });
    });

    const ack = await new Promise<{
      ok: boolean;
      data?: { messageId: string };
    }>((resolve) => {
      client.emit(
        CHAT_SUBSCRIBED_EVENTS.SEND_MESSAGE,
        {
          conversationId: 'conv-1',
          content: 'hello from socket',
        },
        resolve,
      );
    });

    expect(ack).toEqual({ ok: true, data: { messageId: 'msg-1' } });
    expect(mockChatService.sendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'hello from socket',
    });
  });

  it('acknowledges mark transaction completed event', async () => {
    client = await connectClient();

    await new Promise<void>((resolve) => {
      client.once(CHAT_EMITTED_EVENTS.CONVERSATION_JOINED, () => resolve());
      client.emit(CHAT_SUBSCRIBED_EVENTS.JOIN_CONVERSATION, {
        conversationId: 'conv-1',
      });
    });

    const ack = await new Promise<{ ok: boolean; data?: { status: string } }>(
      (resolve) => {
        client.emit(
          CHAT_SUBSCRIBED_EVENTS.MARK_TRANSACTION_COMPLETED,
          {
            conversationId: 'conv-1',
          },
          resolve,
        );
      },
    );

    expect(ack).toEqual({ ok: true, data: { status: 'Archived' } });
    expect(mockChatService.markTransactionCompleted).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'user-1',
    });
  });
});
