import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
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
  SendMessagePayload,
} from './types/chat-ws-payloads.type';
import { ChatConversationMemberGuard } from './guards/chat-conversation-member.guard';
import { ChatConversationWritableGuard } from './guards/chat-conversation-writable.guard';

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
    @Ack() ack?: (response: ChatAck<{ room: string }>) => void,
  ) {
    const room = this.getConversationRoom(payload.conversationId);
    await client.join(room);
    this.server.to(room).emit(CHAT_EMITTED_EVENTS.CONVERSATION_JOINED, {
      conversationId: payload.conversationId,
      userId: client.user.id,
    });

    ack?.({ ok: true, data: { room } });
  }

  @UseGuards(ChatConversationMemberGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.LEAVE_CONVERSATION)
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: LeaveConversationPayload,
    @Ack() ack?: (response: ChatAck<{ room: string }>) => void,
  ) {
    const room = this.getConversationRoom(payload.conversationId);
    await client.leave(room);

    this.server.to(room).emit(CHAT_EMITTED_EVENTS.CONVERSATION_LEFT, {
      conversationId: payload.conversationId,
      userId: client.user.id,
    });

    ack?.({ ok: true, data: { room } });
  }

  @UseGuards(ChatConversationMemberGuard, ChatConversationWritableGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessagePayload,
    @Ack() ack?: (response: ChatAck<{ messageId: string }>) => void,
  ) {
    const message = await this.chatService.sendMessage({
      conversationId: payload.conversationId,
      senderId: client.user.id,
      content: payload.content,
    });

    this.server
      .to(this.getConversationRoom(payload.conversationId))
      .emit(CHAT_EMITTED_EVENTS.MESSAGE_CREATED, message);

    ack?.({ ok: true, data: { messageId: message.id } });
  }

  @UseGuards(ChatConversationMemberGuard)
  @SubscribeMessage(CHAT_SUBSCRIBED_EVENTS.APPROVE_SENSITIVE_MESSAGE)
  async handleApproveSensitiveMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ApproveSensitiveMessagePayload,
    @Ack() ack?: (response: ChatAck<{ approvalId: string }>) => void,
  ) {
    const approval = await this.chatService.approveSensitiveMessage({
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      approverId: client.user.id,
    });

    this.server
      .to(this.getConversationRoom(payload.conversationId))
      .emit(CHAT_EMITTED_EVENTS.SENSITIVE_MESSAGE_APPROVED, {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        approverId: client.user.id,
      });

    ack?.({ ok: true, data: { approvalId: approval.id } });
  }

  private getConversationRoom(conversationId: string): string {
    return `conversation_${conversationId}`;
  }
}
