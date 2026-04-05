import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { USER } from '../authentication/decorators/user.decorartor';
import { DonationType } from './graphql/types/donation.type';
import { CreateDonationInput } from './graphql/inputs/create-donation.input';
import { UpdateDonationInput } from './graphql/inputs/update-donation.input';
import { DonationService } from './v1/donation.service';
import { MessageResponseType } from '../authentication/graphql/types/message-response.type';

@Resolver(() => DonationType)
export class DonationResolver {
  constructor(private readonly donationService: DonationService) {}

  @UseGuards(AccessTokenGuard)
  @Mutation(() => DonationType, {
    description: 'Create a donation listing for the authenticated user',
  })
  async createDonation(
    @Args('input') input: CreateDonationInput,
    @USER('id') userId: string,
  ): Promise<DonationType> {
    return await this.donationService.createDonation(input, userId);
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => DonationType, {
    description:
      'Update a donation listing owned by the authenticated user using id and owner condition',
  })
  async updateDonation(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDonationInput,
    @USER('id') userId: string,
  ): Promise<DonationType> {
    return await this.donationService.updateDonation(id, input, userId);
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType, {
    description:
      'Delete a donation listing owned by the authenticated user using id and owner condition',
  })
  async deleteDonation(
    @Args('id', { type: () => ID }) id: string,
    @USER('id') userId: string,
  ): Promise<MessageResponseType> {
    return await this.donationService.deleteDonation(id, userId);
  }
}
