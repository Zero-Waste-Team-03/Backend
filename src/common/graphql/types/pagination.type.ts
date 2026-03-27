import { Field, ObjectType, Int } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

export interface IPaginatedType<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function Paginated<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IPaginatedType<T> {
    @Field(() => [classRef], { nullable: true })
    items: T[];

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
  return PaginatedType as Type<IPaginatedType<T>>;
}
