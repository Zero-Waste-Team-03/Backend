import { Field, ObjectType, Int } from '@nestjs/graphql';
import { LocationType } from './location.type';

export enum UserRoleType {
  USER = 'User',
  LOCAL_AUTHORITY = 'Local Authority',
  ORGANIZATION = 'Organizations',
  STORE = 'Stores',
  ADMINISTRATOR = 'Administrator',
}

export enum UserStatusType {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
}

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

  @Field(() => String, { description: 'User role' })
  role: string;

  @Field(() => Int, { description: 'User reputation score' })
  reputationScore: number;

  @Field(() => Boolean, {
    description: 'Whether the user has verified their email',
  })
  isMailVerified: boolean;

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

  @Field(() => Date, { description: 'Date the user was created' })
  createdAt: Date;

  @Field(() => Date, { description: 'Date the user was last updated' })
  updatedAt: Date;
}
