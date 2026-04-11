import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  CategorySensitivity,
  CategorySensitivityValues,
} from 'src/core/category/entities/category.entity';

registerEnumType(CategorySensitivityValues, {
  name: 'CategorySensitivity',
  description: 'Sensitivity level of a donation category',
});

@ObjectType('DangerousDonation')
export class DangerousDonationType {
  @Field(() => ID)
  donationId: string;

  @Field(() => String)
  title: string;

  @Field(() => ID)
  categoryId: string;

  @Field(() => String)
  categoryName: string;

  @Field(() => CategorySensitivityValues)
  categorySensitivity: CategorySensitivity;

  @Field(() => Int)
  reportCount: number;

  @Field(() => Boolean)
  safetyChecklistCompleted: boolean;

  @Field(() => Float)
  riskScore: number;

  @Field(() => Date, { nullable: true })
  lastReportedAt?: Date | null;
}
