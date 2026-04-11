import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Roles } from '../authentication/decorators/roles.decorator';
import { UserRoleValues } from '../user/entities/user.entity';
import { StatsService } from './stats.service';
import { AdminDashboardStatsInput } from './graphql/inputs/admin-dashboard-stats.input';
import { AdminDashboardStatsType } from './graphql/types/admin-dashboard-stats.type';
import { StatsGrowthInput } from './graphql/inputs/stats-growth.input';
import { StatsGrowthType } from './graphql/types/stats-growth.type';

@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRoleValues.ADMINISTRATOR)
@Resolver()
export class StatsResolver {
  constructor(private readonly statsService: StatsService) {}

  @Query(() => AdminDashboardStatsType, {
    description: 'Admin dashboard cards stats',
  })
  async adminDashboardStats(
    @Args('input', { nullable: true }) input?: AdminDashboardStatsInput,
  ): Promise<AdminDashboardStatsType> {
    return this.statsService.getAdminDashboardStats(input);
  }

  @Query(() => StatsGrowthType, {
    description: 'Admin growth chart for donations and users',
  })
  async adminGrowthStats(
    @Args('input') input: StatsGrowthInput,
  ): Promise<StatsGrowthType> {
    return this.statsService.getGrowthStats(input);
  }
}
