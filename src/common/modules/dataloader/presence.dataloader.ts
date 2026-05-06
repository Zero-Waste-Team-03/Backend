import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PresenceService } from '../../../core/presence/presence.service';

/**
 * DataLoader for online presence to batch isOnline checks within a single
 * GraphQL request.
 */
@Injectable()
export class PresenceDataLoader {
  constructor(private readonly presenceService: PresenceService) {}

  createLoader(): DataLoader<string, boolean> {
    return new DataLoader<string, boolean>(
      (userIds) => this.presenceService.areOnline(userIds),
      {
        cache: true,
        batch: true,
      },
    );
  }
}
