import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Roles } from '../authentication/decorators/roles.decorator';
import { USER } from '../authentication/decorators/user.decorartor';
import { UserRoleValues } from '../user/entities/user.entity';
import { GamificationService } from './gamification.service';
import { BadgeType } from './graphql/types/badge.type';
import { AchievementType } from './graphql/types/achievement.type';
import { CreateBadgeInput } from './graphql/inputs/create-badge.input';
import { UpdateBadgeInput } from './graphql/inputs/update-badge.input';

@Resolver()
export class GamificationResolver {
  constructor(private readonly gamificationService: GamificationService) {}

  @UseGuards(AccessTokenGuard)
  @Query(() => [BadgeType], {
    description: 'Get active badge catalog',
  })
  async badgeCatalog(): Promise<BadgeType[]> {
    return this.gamificationService.getBadgeCatalog();
  }

  @UseGuards(AccessTokenGuard)
  @Query(() => [AchievementType], {
    description: 'Get current user achievements',
  })
  async myAchievements(@USER('id') userId: string): Promise<AchievementType[]> {
    return this.gamificationService.getUserAchievements(userId);
  }

  @UseGuards(AccessTokenGuard)
  @Query(() => [BadgeType], {
    description: 'Get badges earned by current user',
  })
  async myBadges(@USER('id') userId: string): Promise<BadgeType[]> {
    return this.gamificationService.getUserBadges(userId);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => BadgeType, {
    description: 'Create a badge (Administrator only)',
  })
  async createBadge(
    @Args('input') input: CreateBadgeInput,
  ): Promise<BadgeType> {
    return this.gamificationService.createBadge(input);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => BadgeType, {
    description: 'Update a badge (Administrator only)',
  })
  async updateBadge(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateBadgeInput,
  ): Promise<BadgeType> {
    return this.gamificationService.updateBadge(id, input);
  }
}
