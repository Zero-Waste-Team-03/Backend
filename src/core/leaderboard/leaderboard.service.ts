import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReputationLog } from './entities/reputation-log.entity';
import { UserService } from '../user/v1/user.service';
import { RedisService } from 'nestjs-redis-client';
import { LeaderboardEntry } from './graphql/types/leaderboard-entry.type';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(ReputationLog)
    private readonly reputationLogRepository: Repository<ReputationLog>,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  private getAllTimeKey(): string {
    return 'leaderboard:all_time';
  }

  private getMonthlyKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `leaderboard:monthly:${year}-${month}`;
  }

  async incrementUserPoints(userId: string, points: number): Promise<void> {
    const now = new Date();
    const allTimeKey = this.getAllTimeKey();
    const monthlyKey = this.getMonthlyKey(now);

    try {
      const redisAny = this.redisService as any;
      if (typeof redisAny.zincrby === 'function') {
        await Promise.all([
          redisAny.zincrby(allTimeKey, points, userId),
          redisAny.zincrby(monthlyKey, points, userId),
        ]);
      } else if (typeof redisAny.zIncrBy === 'function') {
        await Promise.all([
          redisAny.zIncrBy(allTimeKey, points, userId),
          redisAny.zIncrBy(monthlyKey, points, userId),
        ]);
      } else {
        const client = redisAny.getClient ? redisAny.getClient() : redisAny.redisClient;
        await Promise.all([
          client.zincrby(allTimeKey, points, userId),
          client.zincrby(monthlyKey, points, userId),
        ]);
      }
    } catch (error) {
      this.logger.error(`Failed to increment Redis ZSET for user ${userId}`, error);
    }
  }

  async getTopUsersAllTime(limit: number): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard(this.getAllTimeKey(), limit);
  }

  async getTopUsersLastMonth(limit: number): Promise<LeaderboardEntry[]> {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return this.getLeaderboard(this.getMonthlyKey(now), limit);
  }

  private async getLeaderboard(key: string, limit: number): Promise<LeaderboardEntry[]> {
    let redisResult: string[] = [];
    const redisAny = this.redisService as any;
    
    if (typeof redisAny.zrevrange === 'function') {
      redisResult = await redisAny.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    } else if (typeof redisAny.zRange === 'function') {
      redisResult = await redisAny.zRange(key, 0, limit - 1, { REV: true, WITHSCORES: true });
    } else {
      const client = redisAny.getClient ? redisAny.getClient() : redisAny.redisClient;
      if (client) {
         redisResult = await client.zrevrange(key, 0, limit - 1, 'WITHSCORES');
      }
    }
    
    if (!redisResult || redisResult.length === 0) {
      return [];
    }

    // redisResult format: [userId1, score1, userId2, score2, ...] from WITHSCORES
    // In node-redis v4 modern, it might be an array of objects `[{ value, score }]`
    const userIds: string[] = [];
    const scoreMap = new Map<string, number>();

    if (typeof redisResult[0] === 'object') {
       for (const item of (redisResult as any)) {
         userIds.push(item.value);
         scoreMap.set(item.value, Number(item.score));
       }
    } else {
      for (let i = 0; i < redisResult.length; i += 2) {
        const id = redisResult[i];
        const score = Number(redisResult[i + 1]);
        userIds.push(id);
        scoreMap.set(id, score);
      }
    }

    if (userIds.length === 0) return [];

    const users = await this.userService.findByIds(userIds);
    const userDtoMap = new Map(users.map(u => [u.id, u]));

    return userIds.map((userId, index) => {
      const user = userDtoMap.get(userId);
      return {
        userId,
        displayName: user?.displayName ?? null,
        avatarUrl: null, // Basic version
        score: scoreMap.get(userId) ?? 0,
        rank: index + 1,
      };
    });
  }
}
