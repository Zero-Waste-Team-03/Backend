import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class JoinConversationPayload {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;
}

export class LeaveConversationPayload {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;
}

export class SendMessagePayload {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

export class ApproveSensitiveMessagePayload {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsUUID()
  @IsNotEmpty()
  messageId: string;
}

export class MarkTransactionCompletedPayload {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;
}

export type AckSuccess<T = Record<string, unknown>> = {
  ok: true;
  data: T;
};

export type AckError = {
  ok: false;
  error: {
    message: string;
  };
};

export type ChatAck<T = Record<string, unknown>> = AckSuccess<T> | AckError;
