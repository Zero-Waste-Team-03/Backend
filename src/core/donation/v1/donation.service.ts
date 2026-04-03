import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Donation,
  DonationUrgencyValues,
  DonationStatusValues,
  type DonationStatus,
  type DonationUrgency,
} from '../entities/donation.entity';
import { CreateDonationInput } from '../graphql/inputs/create-donation.input';
import { UpdateDonationInput } from '../graphql/inputs/update-donation.input';
import { throwAppError } from 'src/common/errors';
import { DonationPhoto } from '../entities/donation-photo.entity';

type DonationResponse = Omit<Donation, 'generateId'> & {
  attachmentIds: string[];
  mainAttachmentId?: string;
};

@Injectable()
export class DonationService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonationPhoto)
    private readonly donationPhotoRepository: Repository<DonationPhoto>,
  ) {}

  private validatePhotoInput(
    attachmentIds?: string[],
    mainAttachmentId?: string,
  ) {
    if (attachmentIds?.length) {
      const deduped = new Set(attachmentIds);
      if (deduped.size !== attachmentIds.length) {
        throwAppError('DONATION_ATTACHMENT_IDS_DUPLICATED', {
          attachmentIds,
        });
      }

      if (mainAttachmentId && !attachmentIds.includes(mainAttachmentId)) {
        throwAppError('DONATION_MAIN_ATTACHMENT_INVALID', {
          mainAttachmentId,
          attachmentIds,
        });
      }
    }
  }

  private async mapDonationResponse(
    donation: Donation,
  ): Promise<DonationResponse> {
    const photos = await this.donationPhotoRepository.find({
      where: { donationId: donation.id },
    });

    return {
      ...donation,
      attachmentIds: photos.map((photo) => photo.attachmentId),
      mainAttachmentId: photos.find((photo) => photo.isMain)?.attachmentId,
    };
  }

  private async replaceDonationPhotos(
    donationId: string,
    attachmentIds?: string[],
    mainAttachmentId?: string,
  ) {
    if (!attachmentIds) return;

    await this.donationPhotoRepository.delete({ donationId });

    if (!attachmentIds.length) return;

    const photos = attachmentIds.map((attachmentId) =>
      this.donationPhotoRepository.create({
        donationId,
        attachmentId,
        isMain: mainAttachmentId === attachmentId,
      }),
    );

    await this.donationPhotoRepository.save(photos);
  }

  private async setMainDonationPhoto(
    donationId: string,
    mainAttachmentId: string,
  ) {
    const existingPhotos = await this.donationPhotoRepository.find({
      where: { donationId },
    });

    if (
      !existingPhotos.some((photo) => photo.attachmentId === mainAttachmentId)
    ) {
      throwAppError('DONATION_MAIN_ATTACHMENT_INVALID', {
        mainAttachmentId,
        attachmentIds: existingPhotos.map((photo) => photo.attachmentId),
      });
    }

    const updatedPhotos = existingPhotos.map((photo) =>
      this.donationPhotoRepository.merge(photo, {
        isMain: photo.attachmentId === mainAttachmentId,
      }),
    );

    await this.donationPhotoRepository.save(updatedPhotos);
  }

  async createDonation(input: CreateDonationInput, userId: string) {
    const expiryDate = new Date(input.expiryDate);

    if (Number.isNaN(expiryDate.getTime())) {
      throwAppError('DONATION_INVALID_EXPIRY_DATE');
    }

    if (input.listingExpiresAt) {
      const listingExpiresAt = new Date(input.listingExpiresAt);
      if (Number.isNaN(listingExpiresAt.getTime())) {
        throwAppError('DONATION_INVALID_EXPIRY_DATE');
      }
    }

    if (input.mainAttachmentId && !input.attachmentIds) {
      throwAppError('DONATION_MAIN_ATTACHMENT_INVALID', {
        mainAttachmentId: input.mainAttachmentId,
      });
    }

    this.validatePhotoInput(input.attachmentIds, input.mainAttachmentId);

    const status =
      (input.status as DonationStatus) ?? DonationStatusValues.DRAFT;

    const donation = this.donationRepository.create({
      userId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      quantity: input.quantity,
      specification: input.specification ?? {},
      expiryDate,
      status,
      urgency:
        (input.urgency as DonationUrgency) ?? DonationUrgencyValues.MEDIUM,
      safetyChecklistCompleted: input.safetyChecklistCompleted ?? false,
      locationId: input.locationId,
      listingExpiresAt: input.listingExpiresAt,
      publishedAt:
        status === DonationStatusValues.PUBLISHED ? new Date() : undefined,
    });

    const savedDonation = await this.donationRepository.save(donation);

    if (input.attachmentIds !== undefined) {
      await this.replaceDonationPhotos(
        savedDonation.id,
        input.attachmentIds,
        input.mainAttachmentId,
      );
    }

    return await this.mapDonationResponse(savedDonation);
  }

  async updateDonation(id: string, input: UpdateDonationInput, userId: string) {
    const donation = await this.donationRepository.findOne({
      where: { id, userId },
    });

    if (!donation) {
      throwAppError('DONATION_NOT_FOUND', { id });
    }

    this.validatePhotoInput(input.attachmentIds, input.mainAttachmentId);

    if (input.expiryDate) {
      const expiryDate = new Date(input.expiryDate);
      if (Number.isNaN(expiryDate.getTime())) {
        throwAppError('DONATION_INVALID_EXPIRY_DATE');
      }
      donation.expiryDate = expiryDate;
    }

    if (input.listingExpiresAt) {
      const listingExpiresAt = new Date(input.listingExpiresAt);
      if (Number.isNaN(listingExpiresAt.getTime())) {
        throwAppError('DONATION_INVALID_EXPIRY_DATE');
      }
      donation.listingExpiresAt = listingExpiresAt;
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
    if (input.urgency !== undefined)
      donation.urgency = input.urgency as DonationUrgency;
    if (input.safetyChecklistCompleted !== undefined)
      donation.safetyChecklistCompleted = input.safetyChecklistCompleted;
    if (input.locationId !== undefined) donation.locationId = input.locationId;

    if (
      input.status === DonationStatusValues.PUBLISHED &&
      !donation.publishedAt
    ) {
      donation.publishedAt = new Date();
    }

    const savedDonation = await this.donationRepository.save(donation);

    if (input.attachmentIds !== undefined) {
      await this.replaceDonationPhotos(
        savedDonation.id,
        input.attachmentIds,
        input.mainAttachmentId,
      );
    } else if (input.mainAttachmentId !== undefined) {
      await this.setMainDonationPhoto(savedDonation.id, input.mainAttachmentId);
    }

    return await this.mapDonationResponse(savedDonation);
  }

  async deleteDonation(id: string, userId: string) {
    const result = await this.donationRepository.delete({ id, userId });

    if (!result.affected) {
      throwAppError('DONATION_NOT_FOUND', { id });
    }

    return { message: 'Donation deleted successfully' };
  }
}
