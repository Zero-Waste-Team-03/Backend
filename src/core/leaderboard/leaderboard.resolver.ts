import { Resolver } from '@nestjs/graphql';
import { LeaderboardService } from './leaderboard.service';

@Resolver()
export class LeaderboardResolver {
  constructor(private readonly leaderboardService: LeaderboardService) {}
}
