import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, MaxLength } from 'class-validator';
import { CategorySensitivityValues, CategorySensitivity } from '../../entities/category.entity';

@InputType('CreateCategoryInput')
export class CreateCategoryInput {
  @Field(() => String)
  @MaxLength(100)
  name: string;

  @Field(() => Number, { nullable: true ,description:"The amount of reputation points a user gains when they complete a donation  in this category. Defaults to 0."})
  reputationGain?: number;
  @Field(() => CategorySensitivityValues, { nullable: true })
  @IsEnum(CategorySensitivityValues)
  sensitivity?: CategorySensitivity;
}
