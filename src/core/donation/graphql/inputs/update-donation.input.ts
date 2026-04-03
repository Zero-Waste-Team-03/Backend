import { InputType, PartialType } from '@nestjs/graphql';
import { CreateDonationInput } from './create-donation.input';

@InputType()
export class UpdateDonationInput extends PartialType(CreateDonationInput) {}
