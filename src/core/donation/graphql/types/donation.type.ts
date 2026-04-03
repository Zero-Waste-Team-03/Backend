import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import {
  DonationUrgency,
  DonationUrgencyValues,
} from '../../entities/donation.entity';

registerEnumType(DonationUrgencyValues, {
  name: 'DonationUrgencyValues',
  description: 'Available urgency levels for donations',
});
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

  @Field(() => Int, { description: 'Available quantity' })
  quantity: number;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Structured specification data',
  })
  specification?: Record<string, any>;

  @Field(() => Date, { description: 'Donation expiry date' })
  expiryDate: Date;

  @Field(() => DonationUrgencyValues, {
    description: 'Urgency level for this listing',
  })
  urgency: DonationUrgency;

  @Field(() => Boolean, {
    description: 'Whether safety checklist is completed',
  })
  safetyChecklistCompleted: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Optional pickup location id',
  })
  locationId?: string | null;

  @Field(() => Date, {
    nullable: true,
    description: 'Date when listing was published',
  })
  publishedAt?: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: 'Date when listing expires for visibility',
  })
  listingExpiresAt?: Date | null;

  @Field(() => String, { description: 'Donation status' })
  status: string;

  @Field(() => [String], {
    description: 'Attachment ids for donation photos',
  })
  attachmentIds: string[];

  @Field(() => String, {
    nullable: true,
    description: 'Main attachment id used as cover photo',
  })
  mainAttachmentId?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
