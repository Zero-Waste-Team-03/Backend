import { Field, ObjectType, Int } from '@nestjs/graphql';

export enum UserRoleType {
  USER = 'User',
  LOCAL_AUTHORITY = 'Local Authority',
  ORGANIZATION = 'Organizations',
  STORE = 'Stores',
  ADMINISTRATOR = 'Administrator',
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

  @Field(() => String, { nullable: true, description: 'User biography/description' })
  description?: string;

  @Field(() => String, { description: 'User role' })
  role: string;

  @Field(() => Int, { description: 'User reputation score' })
  reputationScore: number;

  @Field(() => Boolean, { description: 'Whether the user account is verified' })
  isVerified: boolean;

  @Field(() => Boolean, {
    description: 'Whether the user has verified their email',
  })
  isMailVerified: boolean;

  @Field(() => String, { nullable: true, description: 'Location ID reference' })
  locationId?: string;
}
