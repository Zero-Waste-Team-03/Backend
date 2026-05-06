import { Injectable } from '@nestjs/common';
import { RedisService } from 'nestjs-redis-client';

const PRESENCE_TTL_MS = 60_000;
const PRESENCE_HEARTBEAT_MS = 30_000;

const presenceKey = (userId: string): string => `presence:user:${userId}`;

@Injectable()
export class PresenceService {
  static readonly TTL_MS = PRESENCE_TTL_MS;
  static readonly HEARTBEAT_MS = PRESENCE_HEARTBEAT_MS;

  constructor(private readonly redisService: RedisService) {}

  async markOnline(userId: string, socketId: string): Promise<void> {
    await this.redisService.hSet(
      presenceKey(userId),
      socketId,
      String(Date.now() + PRESENCE_TTL_MS),
    );
  }

  async heartbeat(userId: string, socketId: string): Promise<void> {
    await this.markOnline(userId, socketId);
  }

  async markOffline(userId: string, socketId: string): Promise<void> {
    await this.redisService.hDel(presenceKey(userId), socketId);
  }

  async areOnline(userIds: readonly string[]): Promise<boolean[]> {
    const now = Date.now();
    return Promise.all(
      userIds.map(async (userId) => {
        const entries = await this.redisService.hGetAll(presenceKey(userId));
        return Object.values(entries).some((value) => Number(value) > now);
      }),
    );
  }
}
