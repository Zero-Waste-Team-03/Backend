import {
  Resolver,
  Query,
  Args,
  ResolveField,
  Parent,
  Context,
  Mutation,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from '../v1/user.service';
import { UserRoleValues } from '../entities/user.entity';
import { AccessTokenGuard } from '../../authentication/guards/access-token.guard';
import { RolesGuard } from '../../authentication/guards/roles.guard';
import { Roles } from '../../authentication/decorators/roles.decorator';
import { AdminUsersArgs } from '../graphql/inputs/admin-users.args';
import { UserStatsResponse } from '../graphql/types/user-stats.type';
import { UserType } from '../../authentication/graphql/types/user.type';
import { Paginated } from '../../../common/graphql/types/pagination.type';
import { ObjectType } from '@nestjs/graphql';
import { IDataLoaders } from '../../../common/modules/dataloader/dataloader.interface';
import { LocationType } from '../../authentication/graphql/types/location.type';
import { AdminCreateAccountInput } from '../graphql/inputs/admin-create-account.input';
import { AttachementType } from 'src/common/modules/attachment/graphql/attachement.type';

@ObjectType('PaginatedUsers')
export class PaginatedUsersResponse extends Paginated(UserType) {}

@UseGuards(AccessTokenGuard, RolesGuard)
@Resolver(() => UserType)
export class AdminUserResolver {
  constructor(private readonly userService: UserService) {}

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

  @Roles(UserRoleValues.ADMINISTRATOR)
  @Query(() => UserStatsResponse, {
    name: 'adminGetUserStats',
    description: 'Get user statistics for admin dashboard',
  })
  async adminGetUserStats(): Promise<UserStatsResponse> {
    return this.userService.getUserStats();
  }
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => UserType, {
    description:
      'Suspend a user account, preventing them from logging in or accessing services.',
  })
  async suspendUser(@Args('userId') id: string): Promise<UserType> {
    return this.userService.suspendUser(id);
  }

  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => UserType, {
    description:
      'Activate a user account, enabling them from logging in or accessing services.',
  })
  async activateUser(@Args('userId') id: string): Promise<UserType> {
    return this.userService.activateUser(id);
  }

  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => UserType, {
    name: 'adminCreateAccount',
    description:
      'Create a new user, organization, or administrator account. A temporary password will be generated and sent via email.',
  })
  async adminCreateAccount(
    @Args('input') input: AdminCreateAccountInput,
  ): Promise<UserType> {
    return this.userService.adminCreateAccount(input);
  }

  @ResolveField(() => LocationType, { nullable: true })
  async location(
    @Parent() user: UserType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<LocationType | null> {
    if (!user.locationId) return null;
    return await loaders.locationLoader.load(user.locationId);
  }
  @ResolveField(() => AttachementType, { nullable: true })
  async avatar(
    @Parent() user: UserType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<AttachementType | null> {
    if (!user.avatarAttachmentId) return null;
    return await loaders.attachmentLoader.load(user.avatarAttachmentId);
  }
}
