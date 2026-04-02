import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateDonationInput } from './create-donation.input';
import { IsUUID } from 'class-validator';

@InputType()
export class UpdateDonationInput extends PartialType(CreateDonationInput) {
  @Field(() => String, {
    nullable: true,
    description:
      'Optional replacement attachment id returned by upload endpoint',
  })
  @IsUUID()
  attachmentId?: string;
}
