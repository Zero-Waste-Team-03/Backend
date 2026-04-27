import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { CategorySensitivityValues } from '../../entities/category.entity';

registerEnumType(CategorySensitivityValues, {
  name: 'CategorySensitivityValues',
});

@ObjectType('Category')
export class CategoryType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => CategorySensitivityValues)
  sensitivity: string;
  @Field(() => Number, { description:"The amount of reputation points a user gains when they complete a donation  in this category. Defaults to 0."})
  reputationGain: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
