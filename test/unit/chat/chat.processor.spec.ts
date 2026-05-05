import { Logger } from '@nestjs/common';
import { ChatProcessor } from 'src/infrastructure/queue/chat/chat.processor';
import { CHAT_JOBS } from 'src/common/constants/jobs';

describe('ChatProcessor', () => {
  let processor: ChatProcessor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    processor = new ChatProcessor();
  });

  afterEach(() => {
    logSpy.mockRestore();
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

    expect(logSpy).toHaveBeenCalledWith(
      'No-op chat moderation job processed',
      expect.objectContaining({ jobId: '1' }),
    );
  });
});
