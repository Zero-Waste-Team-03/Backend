import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PaginationQueryInput {
  @Field(() => Int, { defaultValue: 10, nullable: true })
  limit: number = 10;

  @Field(() => Int, { defaultValue: 1, nullable: true })
  page: number = 1;
}
