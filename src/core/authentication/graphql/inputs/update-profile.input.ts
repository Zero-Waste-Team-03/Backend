import { Field, InputType } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserSettingsInput } from '../../../user/graphql/inputs/user-settings.input';
import { LocationInput } from '../../../../common/locations/graphql/inputs/location.input';
import { IsAttachmentExist } from '../../../../common/modules/attachment/decorators/is-attachment-exist.decorator';

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
 *     isVerified
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

  @Field(() => String, {
    nullable: true,
    description: 'User email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Field(() => String, {
    description: 'Phone number of the user',
    nullable: true,
  })
  @IsString()
  phoneNumber?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Avatar attachment ID',
  })
  @IsOptional()
  @IsUUID()
  @IsAttachmentExist()
  avatarAttachmentId?: string;

  @Field(() => UserSettingsInput, {
    nullable: true,
    description: 'User account settings',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserSettingsInput)
  settings?: UserSettingsInput;

  @Field(() => LocationInput, {
    nullable: true,
    description: 'User location details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationInput)
  location?: LocationInput;
}
