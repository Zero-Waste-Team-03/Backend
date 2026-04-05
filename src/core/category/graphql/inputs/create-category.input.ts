import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CategorySensitivityValues, CategorySensitivity } from '../../entities/category.entity';

@InputType('CreateCategoryInput')
export class CreateCategoryInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Field(() => CategorySensitivityValues, { nullable: true })
  @IsEnum(CategorySensitivityValues)
  sensitivity?: CategorySensitivity;
}
