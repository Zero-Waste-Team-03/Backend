export const CHAT_SUBSCRIBED_EVENTS = {
  JOIN_CONVERSATION: 'chat:join-conversation',
  LEAVE_CONVERSATION: 'chat:leave-conversation',
  SEND_MESSAGE: 'chat:send-message',
  APPROVE_SENSITIVE_MESSAGE: 'chat:approve-sensitive-message',
} as const;

export const CHAT_EMITTED_EVENTS = {
  CONVERSATION_JOINED: 'chat:conversation-joined',
  CONVERSATION_LEFT: 'chat:conversation-left',
  MESSAGE_CREATED: 'chat:message-created',
  SENSITIVE_MESSAGE_APPROVED: 'chat:sensitive-message-approved',
  CHAT_ERROR: 'chat:error',
} as const;

export type ChatSubscribedEvent =
  (typeof CHAT_SUBSCRIBED_EVENTS)[keyof typeof CHAT_SUBSCRIBED_EVENTS];

export type ChatEmittedEvent =
  (typeof CHAT_EMITTED_EVENTS)[keyof typeof CHAT_EMITTED_EVENTS];
