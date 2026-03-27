import {
  Resolver,
  Query,
  Args,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './v1/user.service';
import { UserRoleValues } from './entities/user.entity';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Roles } from '../authentication/decorators/roles.decorator';
import { AdminUsersArgs } from './graphql/inputs/admin-users.args';
import { UserStatsResponse } from './graphql/types/user-stats.type';
import { UserType } from '../authentication/graphql/types/user.type';
import { Paginated } from '../../common/graphql/types/pagination.type';
import { ObjectType } from '@nestjs/graphql';
import { IDataLoaders } from '../../common/modules/dataloader/dataloader.interface';
import { LocationType } from '../authentication/graphql/types/location.type';

@ObjectType('PaginatedUsers')
export class PaginatedUsersResponse extends Paginated(UserType) {}

@Resolver(() => UserType)
export class AdminUserResolver {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Query(() => PaginatedUsersResponse, {
    name: 'adminGetUsers',
    description: 'Get paginated list of users for admin panel',
  })
  async adminGetUsers(
    @Args() args: AdminUsersArgs,
  ): Promise<PaginatedUsersResponse> {
    return this.userService.getPaginatedUsers(args);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Query(() => UserStatsResponse, {
    name: 'adminGetUserStats',
    description: 'Get user statistics for admin dashboard',
  })
  async adminGetUserStats(): Promise<UserStatsResponse> {
    return this.userService.getUserStats();
  }

  @ResolveField(() => LocationType, { nullable: true })
  async location(
    @Parent() user: UserType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<LocationType | null> {
    if (!user.locationId) return null;
    return loaders.locationLoader.load(
      user.locationId,
    ) as unknown as LocationType;
  }
}
