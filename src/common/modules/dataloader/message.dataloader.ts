import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Message } from '../../../core/chat/entities/message.entity';

/**
 * DataLoader for Message entity to solve N+1 query problem
 *
 * Batches and caches Message queries within a single GraphQL request.
 */
@Injectable()
export class MessageDataLoader {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  createLoader(): DataLoader<string, Message | null> {
    return new DataLoader<string, Message | null>(
      async (ids: readonly string[]) => {
        const messages = await this.messageRepository.find({
          where: { id: In([...ids]) },
        });
        const map = new Map(messages.map((m) => [m.id, m]));
        return ids.map((id) => map.get(id) ?? null);
      },
      { cache: true, batch: true },
    );
  }
}
