import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './v1/user.service';
import { UserType } from '../authentication/graphql/types/user.type';
import { UpdateProfileInput } from '../authentication/graphql/inputs/update-profile.input';
import { MessageResponseType } from '../authentication/graphql/types/message-response.type';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { USER } from '../authentication/decorators/user.decorartor';
import { User } from './entities/user.entity';
import { ChangePasswordInput } from 'src/core/user/graphql/inputs/change-password.input';
import { LocationType } from '../authentication/graphql/types/location.type';
import { IDataLoaders } from 'src/common/modules/dataloader/dataloader.interface';
import { AttachementType } from 'src/common/modules/attachment/graphql/attachement.type';
import { UserSettingsType } from './graphql/types/user-settings.type';
import { PaginatedUsersResponse } from './admin/admin-user.resolver';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';

/**
 * GraphQL resolver for user operations
 *
 * Provides queries and mutations for:
 * - Getting current authenticated user
 * - Updating user profile
 * - Deleting user account
 */
@Resolver(() => UserType)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  /**
   * Get current authenticated user
   *
   * @param user - User object from access token
   * @returns Current user details
   *
   * @example
   * query {
   *   currentUser {
   *     id
   *     email
   *     isVerified
   *   }
   * }
   *
   * # HTTP Headers:
   * # Authorization: Bearer <access-token>
   */
  @UseGuards(AccessTokenGuard)
  @Query(() => UserType, {
    description: 'Get current authenticated user profile',
  })
  async currentUser(@USER() user: User): Promise<UserType> {
    // Fetch fresh user data from database
    const currentUser = await this.userService.findById(user.id);
    if (!currentUser) {
      throw new Error('User not found');
    }
    return currentUser;
  }

  /**
   * Update current user profile
   *
   * @param updateProfileInput - Profile fields to update
   * @param user - User object from access token
   * @returns Updated user details
   *
   * @example
   * mutation {
   *   updateProfile(updateProfileInput: {
   *     displayName: "New Name"
   *   }) {
   *     id
   *     email
   *     isVerified
   *   }
   * }
   *
   * # HTTP Headers:
   * # Authorization: Bearer <access-token>
   */
  @UseGuards(AccessTokenGuard)
  @Mutation(() => UserType, {
    description: 'Update current user profile information',
  })
  async updateProfile(
    @Args('updateProfileInput') updateProfileInput: UpdateProfileInput,
    @USER() user: User,
  ): Promise<UserType> {
    return await this.userService.updateUser(user.id, updateProfileInput);
  }

  /**
   * Change current user password
   */
  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType, {
    description: 'Change current user password',
  })
  async changePassword(
    @Args('changePasswordInput') changePasswordInput: ChangePasswordInput,
    @USER() user: User,
  ): Promise<MessageResponseType> {
    return this.userService.changePassword(user.id, changePasswordInput);
  }

  /**
   * Delete current user account
   *
   * @param user - User object from access token
   * @returns Success message
   *
   * @example
   * mutation {
   *   deleteAccount {
   *     message
   *   }
   * }
   *
   * # HTTP Headers:
   * # Authorization: Bearer <access-token>
   */
  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType, {
    description: 'Delete current user account permanently',
  })
  async deleteAccount(@USER() user: User): Promise<MessageResponseType> {
    return this.userService.deleteUser(user.id);
  }
  @UseGuards(AccessTokenGuard)
  @Query(() => PaginatedUsersResponse)
  async getUsersFromSameNeighborhood(
    @USER('id') userId: string,
    @Args('pagination', { type: () => PaginationInput })
    pagination: PaginationInput,
    @Args('search', { type: () => String, nullable: true }) search?: string,
  ): Promise<PaginatedUsersResponse> {
    return this.userService.getusersFromSameZipCode(userId, pagination, search);
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

  @ResolveField(() => AttachementType, { nullable: true })
  async attachment(
    @Parent() user: UserType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<AttachementType | null> {
    return this.avatar(user, { loaders });
  }
  //NOTE: this does not use dataloader as user settinng are only queries on user profile and not in list of users, so no N+1 problem, and also user settings are not expected to be queried as much as other fields, so performance impact is minimal
  @ResolveField(() => UserSettingsType, { nullable: true })
  async settings(@Parent() user: UserType): Promise<UserSettingsType | null> {
    if (!user.id) return null;
    return await this.userService.getUserSettings(user.id);
  }
}
