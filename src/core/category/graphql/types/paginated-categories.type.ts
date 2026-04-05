import { Field, Int, ObjectType } from '@nestjs/graphql';
import { CategoryType } from './category.type';

@ObjectType('PaginatedCategories')
export class PaginatedCategories {
  @Field(() => [CategoryType], { nullable: true })
  items: CategoryType[];

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
