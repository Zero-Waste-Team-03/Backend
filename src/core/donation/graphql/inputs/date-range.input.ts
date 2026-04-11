import { Field, InputType } from '@nestjs/graphql';
import { IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@InputType('DateRangeInput')
export class DateRangeInput {
  @Field(() => Date)
  @Type(() => Date)
  @IsDate()
  from: Date;

  @Field(() => Date)
  @Type(() => Date)
  @IsDate()
  to: Date;
}
