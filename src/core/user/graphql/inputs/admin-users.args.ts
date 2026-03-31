import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import {
  UserRoleValues,
  UserRole,
  UserStatusValues,
  UserStatus,
} from '../../entities/user.entity';

@ArgsType()
export class AdminUsersArgs {
  @Field(() => Int, { defaultValue: 1, description: 'Page number' })
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Field(() => Int, { defaultValue: 10, description: 'Items per page' })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number = 10;

  @Field(() => String, {
    nullable: true,
    description: 'Search by name or email',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @Field(() => UserRoleValues, {
    nullable: true,
    description: 'Filter by user role',
  })
  @IsEnum(UserRoleValues)
  @IsOptional()
  role?: UserRole;

  @Field(() => String, { nullable: true, description: 'Filter by user status' })
  @IsEnum(UserStatusValues)
  @IsOptional()
  status?: UserStatus;
}
