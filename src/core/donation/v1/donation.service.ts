import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Donation,
  DonationStatusValues,
  type DonationStatus,
} from '../entities/donation.entity';
import { CreateDonationInput } from '../graphql/inputs/create-donation.input';
import { UpdateDonationInput } from '../graphql/inputs/update-donation.input';
import { throwAppError } from 'src/common/errors';

@Injectable()
export class DonationService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
  ) {}

  async createDonation(input: CreateDonationInput, userId: string) {
    const expiryDate = new Date(input.expiryDate);

    if (Number.isNaN(expiryDate.getTime())) {
      throwAppError('DONATION_INVALID_EXPIRY_DATE');
    }

    const donation = this.donationRepository.create({
      ...input,
      userId,
      status: (input.status as DonationStatus) ?? DonationStatusValues.DRAFT,
      specification: input.specification ?? {},
      expiryDate,
    });

    return await this.donationRepository.save(donation);
  }

  async updateDonation(id: string, input: UpdateDonationInput, userId: string) {
    const donation = await this.donationRepository.findOne({
      where: { id, userId },
    });

    if (!donation) {
      throwAppError('DONATION_NOT_FOUND', { id });
    }

    if (input.expiryDate) {
      const expiryDate = new Date(input.expiryDate);
      if (Number.isNaN(expiryDate.getTime())) {
        throwAppError('DONATION_INVALID_EXPIRY_DATE');
      }
      donation.expiryDate = expiryDate;
    }

    if (input.categoryId !== undefined) donation.categoryId = input.categoryId;
    if (input.title !== undefined) donation.title = input.title;
    if (input.description !== undefined)
      donation.description = input.description;
    if (input.quantity !== undefined) donation.quantity = input.quantity;
    if (input.specification !== undefined)
      donation.specification = input.specification;
    if (input.status !== undefined)
      donation.status = input.status as DonationStatus;
    if (input.attachmentId !== undefined)
      donation.attachmentId = input.attachmentId;

    return await this.donationRepository.save(donation);
  }

  async deleteDonation(id: string, userId: string) {
    const result = await this.donationRepository.delete({ id, userId });

    if (!result.affected) {
      throwAppError('DONATION_NOT_FOUND', { id });
    }

    return { message: 'Donation deleted successfully' };
  }
}
