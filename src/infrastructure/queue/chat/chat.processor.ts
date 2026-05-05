import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CHAT_JOBS } from 'src/common/constants/jobs';
import { QUEUE_NAME } from 'src/common/constants/queues';

type ModerateMessagePayload = {
  conversationId: string;
  messageId: string;
  senderId: string;
};

@Processor(QUEUE_NAME.CHAT)
export class ChatProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatProcessor.name);

  async process(job: Job<ModerateMessagePayload>): Promise<void> {
    if (job.name !== CHAT_JOBS.MODERATE_MESSAGE) {
      this.logger.warn(`Unknown chat job ${job.name}`);
      return;
    }

    this.logger.log('No-op chat moderation job processed', {
      jobId: job.id,
      conversationId: job.data.conversationId,
      messageId: job.data.messageId,
      senderId: job.data.senderId,
    });
  }
}
