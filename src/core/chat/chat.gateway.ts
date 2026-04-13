import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { WsConnectionsManagerGateway } from '../websocket/ws-connections-manager.gateway';
import { AuthenticatedSocket } from '../websocket/types/authenticated-socket.type';
import { ChatService } from './chat.service';
import {
  CHAT_EMITTED_EVENTS,
  CHAT_SUBSCRIBED_EVENTS,
} from './constants/chat-ws-events';
import {
  ApproveSensitiveMessagePayload,
  ChatAck,
  JoinConversationPayload,
  LeaveConversationPayload,
  MarkTransactionCompletedPayload,
  SendMessagePayload,
} from './types/chat-ws-payloads.type';
import { ChatConversationMemberGuard } from './guards/chat-conversation-member.guard';
import { ChatConversationWritableGuard } from './guards/chat-conversation-writable.guard';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory(errors) {
      return new WsException(errors);
    },
  }),
)
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : '*',
    credentials: true,
  },
})
export class ChatGateway
  extends WsConnectionsManagerGateway
  implements OnGatewayConnection
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {
    super();
  }

  override async handleConnection(client: AuthenticatedSocket) {
    await super.handleConnection(client);
  }

  @UseGuards(ChatConversationMemberGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.JOIN_CONVERSATION)
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayload,
  ): Promise<ChatAck<{ room: string }>> {
    const room = this.getConversationRoom(payload.conversationId);
    await client.join(room);
    client.to(room).emit(CHAT_EMITTED_EVENTS.CONVERSATION_JOINED, {
      conversationId: payload.conversationId,
      userId: client.user.id,
    });
    return { ok: true, data: { room } };
  }

  @UseGuards(ChatConversationMemberGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.LEAVE_CONVERSATION)
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: LeaveConversationPayload,
  ): Promise<ChatAck<{ room: string }>> {
    const room = this.getConversationRoom(payload.conversationId);
    await client.leave(room);

    client.to(room).emit(CHAT_EMITTED_EVENTS.CONVERSATION_LEFT, {
      conversationId: payload.conversationId,
      userId: client.user.id,
    });

    return { ok: true, data: { room } };
  }

  @UseGuards(ChatConversationMemberGuard, ChatConversationWritableGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<ChatAck<{ messageId: string }>> {
    const message = await this.chatService.sendMessage({
      conversationId: payload.conversationId,
      senderId: client.user.id,
      content: payload.content,
    });

    client
      .to(this.getConversationRoom(payload.conversationId))
      .emit(CHAT_EMITTED_EVENTS.MESSAGE_CREATED, message);

    return { ok: true, data: { messageId: message.id } };
  }

  @UseGuards(ChatConversationMemberGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.APPROVE_SENSITIVE_MESSAGE)
  async handleApproveSensitiveMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ApproveSensitiveMessagePayload,
  ): Promise<ChatAck<{ approvalId: string }>> {
    const approval = await this.chatService.approveSensitiveMessage({
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      approverId: client.user.id,
    });

    client
      .to(this.getConversationRoom(payload.conversationId))
      .emit(CHAT_EMITTED_EVENTS.SENSITIVE_MESSAGE_APPROVED, {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        approverId: client.user.id,
      });

    return { ok: true, data: { approvalId: approval.id } };
  }

  @UseGuards(ChatConversationMemberGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.MARK_TRANSACTION_COMPLETED)
  async handleMarkTransactionCompleted(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MarkTransactionCompletedPayload,
  ): Promise<ChatAck<{ status: string }>> {
    const conversation = await this.chatService.markTransactionCompleted({
      conversationId: payload.conversationId,
      userId: client.user.id,
    });

    client
      .to(this.getConversationRoom(payload.conversationId))
      .emit(CHAT_EMITTED_EVENTS.TRANSACTION_COMPLETED, {
        conversationId: payload.conversationId,
        status: conversation.status,
      });

    return { ok: true, data: { status: conversation.status } };
  }

  private getConversationRoom(conversationId: string): string {
    return `conversation_${conversationId}`;
  }
}
