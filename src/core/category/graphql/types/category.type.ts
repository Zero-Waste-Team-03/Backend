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

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
