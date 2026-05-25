import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntry } from './graphql/types/leaderboard-entry.type';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { USER } from '../authentication/decorators/user.decorartor';

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

  @UseGuards(AccessTokenGuard)
  @Query(() => LeaderboardEntry, {
    name: 'myLeaderboardRankAllTime',
    nullable: true,
  })
  async getMyLeaderboardRankAllTime(
    @USER('id') userId: string,
  ): Promise<LeaderboardEntry | null> {
    return this.leaderboardService.getUserRankAllTime(userId);
  }

  @UseGuards(AccessTokenGuard)
  @Query(() => LeaderboardEntry, {
    name: 'myLeaderboardRankLastMonth',
    nullable: true,
  })
  async getMyLeaderboardRankLastMonth(
    @USER('id') userId: string,
  ): Promise<LeaderboardEntry | null> {
    return this.leaderboardService.getUserRankLastMonth(userId);
  }
}
