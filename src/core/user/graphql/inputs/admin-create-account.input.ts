import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole, UserRoleValues } from '../../entities/user.entity';


@InputType()
export class AdminCreateAccountInput {
  @Field({ description: 'Full display name of the new account holder' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  displayName: string;

  @Field({ description: 'Email address for the new account (must be unique)' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field(() => String, {
    description:
      'Role to assign: "Administrator", "Organizations", "Stores", or "User"',
  })
  @IsEnum(UserRoleValues)
  role: UserRole;
}
