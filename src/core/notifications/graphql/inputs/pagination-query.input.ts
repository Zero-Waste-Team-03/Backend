import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Min } from 'class-validator';

@InputType()
export class PaginationQueryInput {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { defaultValue: 10, nullable: true })
  limit: number = 10;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { defaultValue: 1, nullable: true })
  page: number = 1;
}
