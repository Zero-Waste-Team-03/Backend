import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, IsNumber, Min } from 'class-validator';

@InputType('PaginationInput')
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @Field(() => Int, { defaultValue: 10, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit: number = 10;
}
