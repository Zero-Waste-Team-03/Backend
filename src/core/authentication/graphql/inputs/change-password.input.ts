import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsStrongPassword } from 'class-validator';

@InputType()
export class ChangePasswordInput {
  /** * Current password of the user
   */
  @Field({ description: 'Current password of the user' })
  @IsNotEmpty()
  currentPassword: string;

  /**
   * New password to set for the user
   */
  @Field({ description: 'New password to set for the user' })
  @IsStrongPassword()
  @IsNotEmpty({ message: 'New password must not be empty' })
  newPassword: string;
  @Field({
    description:
      'If the user whishes to logout from all other devics after password changes this will eventually log out all the users up to 5 mins interval ',
    defaultValue: false,
    nullable: true,
  })
  logoutFromOtherDevices?: boolean;
}
