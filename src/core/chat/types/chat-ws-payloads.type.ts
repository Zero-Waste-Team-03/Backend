export type JoinConversationPayload = {
  conversationId: string;
};

export type LeaveConversationPayload = {
  conversationId: string;
};

export type SendMessagePayload = {
  conversationId: string;
  content: string;
};

export type ApproveSensitiveMessagePayload = {
  conversationId: string;
  messageId: string;
};

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
