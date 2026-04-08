import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { UserService } from '../../../core/user/v1/user.service';
import { User } from '../../../core/user/entities/user.entity';

/**
 * DataLoader for User entity to solve N+1 query problem
 *
 * Batches and caches User queries within a single GraphQL request
 * to prevent multiple database calls for the same user.
 *
 * @example
 * // Instead of N queries:
 * // SELECT * FROM users WHERE id = 1
 * // SELECT * FROM users WHERE id = 2
 * // SELECT * FROM users WHERE id = 3
 *
 * // DataLoader batches into 1 query:
 * // SELECT * FROM users WHERE id IN (1, 2, 3)
 */
@Injectable()
export class UserDataLoader {
  constructor(private readonly userService: UserService) {}

  /**
   * Creates a new DataLoader instance for batching user queries by ID
   *
   * Must be called once per GraphQL request to ensure proper caching scope
   *
   * @returns DataLoader instance for User entities
   */
  createLoader(): DataLoader<string, User | null> {
    return new DataLoader<string, User | null>(
      async (userIds: readonly string[]) => {
        const users = await this.userService.findByIds(userIds as string[]);

        const userMap = users.reduce((map, user) => {
          map[user.id] = user;
          return map;
        }, {} as Record<string, User>);

        return userIds.map((id) => userMap[id] || null);
      },
      {
        // Cache results within the same request
        cache: true,
        // Batch multiple load() calls in the same event loop tick
        batch: true,
      },
    );
  }
}
