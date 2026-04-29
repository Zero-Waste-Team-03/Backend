import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CategorySensitivityValues, CategorySensitivity } from '../../entities/category.entity';

@InputType('CreateCategoryInput')
export class CreateCategoryInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'The amount of reputation points a user gains when they complete a donation in this category. Defaults to 10.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reputationGain?: number;
  @Field(() => CategorySensitivityValues, { nullable: true })
  @IsEnum(CategorySensitivityValues)
  sensitivity?: CategorySensitivity;
}
