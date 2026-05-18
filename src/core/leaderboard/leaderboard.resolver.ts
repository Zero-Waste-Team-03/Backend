import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntry } from './graphql/types/leaderboard-entry.type';

@Resolver(() => LeaderboardEntry)
export class LeaderboardResolver {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Query(() => [LeaderboardEntry], { name: 'leaderboardAllTime' })
  async getLeaderboardAllTime(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<LeaderboardEntry[]> {
    return this.leaderboardService.getTopUsersAllTime(limit);
  }

  @Query(() => [LeaderboardEntry], { name: 'leaderboardLastMonth' })
  async getLeaderboardLastMonth(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<LeaderboardEntry[]> {
    return this.leaderboardService.getTopUsersLastMonth(limit);
  }
}
