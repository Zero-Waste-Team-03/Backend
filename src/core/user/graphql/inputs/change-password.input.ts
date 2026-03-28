import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class ChangePasswordInput {
  @Field({ description: 'Current password' })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @Field({ description: 'New password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
