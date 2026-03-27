import { Field, Int, ObjectType } from '@nestjs/graphql';
import { UserType } from '../../../authentication/graphql/types/user.type';

@ObjectType('PaginatedUsers')
export class PaginatedUsersResponse {
  @Field(() => [UserType])
  items: UserType[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;
}
