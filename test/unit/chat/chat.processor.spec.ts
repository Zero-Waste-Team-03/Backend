import { ChatProcessor } from 'src/infrastructure/queue/chat/chat.processor';
import { CHAT_JOBS } from 'src/common/constants/jobs';

describe('ChatProcessor', () => {
  let processor: ChatProcessor;

  beforeEach(() => {
    processor = new ChatProcessor();
  });

  it('processes no-op moderation job', async () => {
    await expect(
      processor.process({
        id: '1',
        name: CHAT_JOBS.MODERATE_MESSAGE,
        data: {
          conversationId: 'conv-1',
          messageId: 'msg-1',
          senderId: 'user-1',
        },
      } as any),
    ).resolves.toBeUndefined();
  });
});
