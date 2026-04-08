import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { Reservation } from '../reservation/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Reservation])],
  providers: [ChatService, ChatResolver],
  exports: [ChatService],
})
export class ChatModule {}
