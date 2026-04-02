import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('Donation')
export class DonationType {
  @Field(() => ID)
  id: string;

  @Field(() => String, { description: 'Owner user id (donor)' })
  userId: string;

  @Field(() => String, { description: 'Category id' })
  categoryId: string;

  @Field(() => String, { description: 'Donation title' })
  title: string;

  @Field(() => String, { description: 'Donation description' })
  description: string;

  @Field(() => Number, { description: 'Available quantity' })
  quantity: number;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Structured specification data',
  })
  specification?: Record<string, any>;

  @Field(() => Date, { description: 'Donation expiry date' })
  expiryDate: Date;

  @Field(() => String, { description: 'Donation status' })
  status: string;

  @Field(() => String, {
    nullable: true,
    description: 'Attachment id returned by upload endpoint',
  })
  attachmentId?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
