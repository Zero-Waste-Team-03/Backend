import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

/**
 * Input type for updating user profile
 *
 * @example
 * mutation {
 *   updateProfile(updateProfileInput: {
 *     displayName: "New Name"
 *   }) {
 *     id
 *     email
 *     isMailVerified
 *   }
 * }
 */
@InputType()
export class UpdateProfileInput {
  @Field(() => String, {
    nullable: true,
    description: 'New display name for the user',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  // Add more fields as needed for profile updates
}
