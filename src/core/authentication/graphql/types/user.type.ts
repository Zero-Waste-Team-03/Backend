import { Field, ObjectType, Int } from '@nestjs/graphql';
import { LocationType } from './location.type';
import { UserSettingsType } from '../../../user/graphql/types/user-settings.type';
import { AttachementType } from 'src/common/modules/attachment/graphql/attachement.type';
import { UserRole, UserRoleValues } from 'src/core/user/entities/user.entity';
import { registerEnumType } from '@nestjs/graphql';

registerEnumType(UserRoleValues, {
  name: 'UserRole',
  description: 'Available user roles',
});

/**
 * GraphQL User object type
 *
 * Represents a user in the system
 * Password field is intentionally excluded from GraphQL schema for security
 */
@ObjectType('User')
export class UserType {
  @Field(() => String, { description: 'User unique identifier' })
  id: string;

  @Field(() => String, { description: 'User email address' })
  email: string;

  @Field(() => String, { nullable: true, description: 'User display name' })
  displayName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'User biography/description',
  })
  description?: string;

  @Field(() => UserRoleValues, { description: 'User role' })
  role: UserRole;

  @Field(() => Int, { description: 'User reputation score' })
  reputationScore: number;

  @Field(() => Boolean, {
    description: 'Whether the user is verified',
  })
  isVerified: boolean;

  @Field(() => String, { nullable: true, description: 'Location ID reference' })
  locationId?: string;

  @Field(() => LocationType, {
    nullable: true,
    description: 'Location details associated with user',
  })
  location?: LocationType;

  @Field(() => String, {
    nullable: true,
    description: 'Attachment ID reference',
  })
  avatarAttachmentId?: string;

  @Field(() => String, { description: 'User account status' })
  status: string;

  @Field(()=>String, { nullable: true, description: 'User phone number' })
  phoneNumber?: string;

  @Field(() => Date, { description: 'Date the user was created' })
  createdAt: Date;

  @Field(() => Date, { description: 'Date the user was last updated' })
  updatedAt: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Date the user last changed password',
  })
  lastChangedPasswordDate?: Date;

  @Field(() => AttachementType, {
    description: 'User avatar attachment details',
    nullable: true,
  })
  avatar?: AttachementType;
  @Field(() => UserSettingsType, {
    nullable: true,
    description: 'User account settings',
  })
  settings?: UserSettingsType;

  @Field(() => AttachementType, {
    description: 'Alias for avatar attachment details',
    nullable: true,
  })
  attachment?: AttachementType;
}
