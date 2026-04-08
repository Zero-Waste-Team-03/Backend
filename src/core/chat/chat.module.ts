import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { Reservation } from '../reservation/entities/reservation.entity';
import { ChatStateMachineService } from './chat-state-machine.service';
import { ChatGateway } from './chat.gateway';
import { ChatConversationMemberGuard } from './guards/chat-conversation-member.guard';
import { ChatConversationWritableGuard } from './guards/chat-conversation-writable.guard';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Reservation]),
    UserModule,
    JwtModule,
    NotificationsModule,
  ],
  providers: [
    ChatService,
    ChatResolver,
    ChatStateMachineService,
    ChatGateway,
    ChatConversationMemberGuard,
    ChatConversationWritableGuard,
  ],
  exports: [ChatService],
})
export class ChatModule {}
