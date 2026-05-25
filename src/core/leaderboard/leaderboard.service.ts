import { Injectable} from '@nestjs/common';
import { UserService } from '../user/v1/user.service';
import { RedisService } from 'nestjs-redis-client';
import { LeaderboardEntry } from './graphql/types/leaderboard-entry.type';

@Injectable()
export class LeaderboardService {

  constructor(
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

    await Promise.all([
      this.redisService.zIncrBy(allTimeKey, points, userId),
      this.redisService.zIncrBy(monthlyKey, points, userId),
    ]);
  }

  async getTopUsersAllTime(limit: number): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard(this.getAllTimeKey(), limit);
  }

  async getTopUsersLastMonth(limit: number): Promise<LeaderboardEntry[]> {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return this.getLeaderboard(this.getMonthlyKey(now), limit);
  }

  async getUserRankAllTime(userId: string): Promise<LeaderboardEntry | null> {
    return this.getUserRank(this.getAllTimeKey(), userId);
  }

  async getUserRankLastMonth(userId: string): Promise<LeaderboardEntry | null> {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return this.getUserRank(this.getMonthlyKey(now), userId);
  }

  private async getUserRank(
    key: string,
    userId: string,
  ): Promise<LeaderboardEntry | null> {
    // Access the underlying ioredis client to use zrevrank

    const [rank, score] = await Promise.all([
      this.redisService.zRevRank(key, userId),
      this.redisService.zScore(key, userId),
    ]);

    if (rank === null || score === null) {
      return null;
    }

    const users = await this.userService.findByIdsWithRelations([userId], {
      avatar: true,
    });
    const user = users[0];

    return {
      userId,
      displayName: user?.displayName ?? null,
      avatarUrl: user?.avatar?.url ?? null,
      score: Number(score),
      rank: rank + 1,
    };
  }

  private async getLeaderboard(
    key: string,
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    const redisResult = await this.redisService.zRevRangeWithScores(
      key,
      0,
      limit - 1,
    );

    if (!redisResult || redisResult.length === 0) {
      return [];
    }

    // redisResult format: [userId1, score1, userId2, score2, ...] from WITHSCORES
    // In node-redis v4 modern, it might be an array of objects `[{ value, score }]`
    const userIds: string[] = [];
    const scoreMap = new Map<string, number>();

    for (const item of redisResult) {
      userIds.push(item.value);
      scoreMap.set(item.value, Number(item.score));
    }

    if (userIds.length === 0) return [];

    const users = await this.userService.findByIdsWithRelations(userIds, {
      avatar: true,
    });
    const userDtoMap = new Map(users.map((u) => [u.id, u]));

    return userIds.map((userId, index) => {
      const user = userDtoMap.get(userId);
      return {
        userId,
        displayName: user?.displayName ?? null,
        avatarUrl: user?.avatar?.url ?? null, // Basic version
        score: scoreMap.get(userId) ?? 0,
        rank: index + 1,
      };
    });
  }
}
