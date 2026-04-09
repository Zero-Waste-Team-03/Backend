import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ChatService } from '../chat.service';
import { ConversationStatusValues } from '../entities/conversation.entity';
import { throwAppError } from 'src/common/errors';
import { AuthenticatedSocket } from 'src/core/websocket/types/authenticated-socket.type';

@Injectable()
export class ChatConversationWritableGuard implements CanActivate {
  constructor(private readonly chatService: ChatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { conversationId, userId } = this.extractContextData(context);
    const status = await this.chatService.getConversationStatus(
      conversationId,
      userId,
    );

    if (status !== ConversationStatusValues.ACTIVE) {
      throwAppError('CHAT_MESSAGE_READ_ONLY', { status });
    }

    return true;
  }

  private extractContextData(context: ExecutionContext): {
    conversationId: string;
    userId: string;
  } {
    if (context.getType<'ws' | 'graphql'>() === 'ws') {
      const client = context.switchToWs().getClient<AuthenticatedSocket>();
      const data = context.switchToWs().getData<{ conversationId?: string }>();
      return {
        conversationId: data?.conversationId || '',
        userId: client.user.id,
      };
    }

    const gqlContext = GqlExecutionContext.create(context);
    const req = gqlContext.getContext<{ req?: { user?: { id?: string } } }>()
      ?.req;
    const args = gqlContext.getArgs<{
      input?: { conversationId?: string };
      conversationId?: string;
    }>();

    return {
      conversationId: args?.input?.conversationId || args?.conversationId || '',
      userId: req?.user?.id || '',
    };
  }
}
