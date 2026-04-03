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
import { Location } from 'src/common/locations/entities/location.entity';
import { LocationInput } from 'src/common/locations/graphql/inputs/location.input';

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
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  private async resolveLocationId(
    locationId?: string | null,
    locationInput?: LocationInput,
  ): Promise<string | undefined> {
    if (locationId && locationInput) {
      throwAppError('DONATION_LOCATION_XOR_INVALID', {
        locationId,
      });
    }

    if (locationId) return locationId;
    if (!locationInput) return undefined;

    const location = this.locationRepository.create(locationInput);
    const savedLocation = await this.locationRepository.save(location);
    return savedLocation.id;
  }

  private async resolveUpdateLocationId(
    input: UpdateDonationInput,
  ): Promise<string | null | undefined> {
    if (input.locationId !== undefined && input.locationInput !== undefined) {
      throwAppError('DONATION_LOCATION_XOR_INVALID', {
        locationId: String(input.locationId),
      });
    }

    if (input.locationInput !== undefined) {
      const location = this.locationRepository.create(input.locationInput);
      const savedLocation = await this.locationRepository.save(location);
      return savedLocation.id;
    }

    if ('locationId' in input) {
      return input.locationId ?? null;
    }

    return undefined;
  }

  private buildUpdatePatch(input: UpdateDonationInput): Partial<Donation> {
    const patch: Partial<Donation> = {};

    if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.quantity !== undefined) patch.quantity = input.quantity;
    if (input.specification !== undefined)
      patch.specification = input.specification;
    if (input.urgency !== undefined)
      patch.urgency = input.urgency as DonationUrgency;
    if (input.safetyChecklistCompleted !== undefined) {
      patch.safetyChecklistCompleted = input.safetyChecklistCompleted;
    }

    return patch;
  }

  private validatePhotoInput(
    attachmentIds?: string[],
    mainAttachmentId?: string,
  ) {
    if (!mainAttachmentId) {
      throwAppError('DONATION_MAIN_ATTACHMENT_INVALID', {
        attachmentIds,
      });
    }

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
    attachmentIds: string[],
    mainAttachmentId: string,
  ) {
    await this.donationPhotoRepository.delete({ donationId });

    const allAttachmentIds = Array.from(
      new Set([mainAttachmentId, ...attachmentIds]),
    );

    const photos = allAttachmentIds.map((attachmentId) =>
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

    this.validatePhotoInput(input.attachmentIds, input.mainAttachmentId);
    const locationId = await this.resolveLocationId(
      input.locationId,
      input.locationInput,
    );
    const status = DonationStatusValues.PUBLISHED;

    const donation = this.donationRepository.create({
      userId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      quantity: input.quantity,
      specification: input.specification ?? {},
      expiryDate,
      status: status as DonationStatus,
      urgency:
        (input.urgency as DonationUrgency) ?? DonationUrgencyValues.MEDIUM,
      safetyChecklistCompleted: input.safetyChecklistCompleted ?? false,
      locationId,
      listingExpiresAt: input.listingExpiresAt,
      publishedAt:
        status === DonationStatusValues.PUBLISHED ? new Date() : undefined,
    });

    const savedDonation = await this.donationRepository.save(donation);

    await this.replaceDonationPhotos(
      savedDonation.id,
      input.attachmentIds ?? [],
      input.mainAttachmentId,
    );

    return await this.mapDonationResponse(savedDonation);
  }

  async updateDonation(id: string, input: UpdateDonationInput, userId: string) {
    const donation = await this.donationRepository.findOne({
      where: { id, userId },
    });

    if (!donation) {
      throwAppError('DONATION_NOT_FOUND', { id });
    }

    if (
      input.attachmentIds !== undefined ||
      input.mainAttachmentId !== undefined
    ) {
      this.validatePhotoInput(input.attachmentIds, input.mainAttachmentId);
    }

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

    Object.assign(donation, this.buildUpdatePatch(input));

    const resolvedLocationId = await this.resolveUpdateLocationId(input);
    if (resolvedLocationId !== undefined) {
      donation.locationId = resolvedLocationId;
    }

    const savedDonation = await this.donationRepository.save(donation);

    if (input.attachmentIds !== undefined) {
      const mainAttachmentId =
        input.mainAttachmentId ??
        (await this.mapDonationResponse(savedDonation)).mainAttachmentId;

      if (!mainAttachmentId) {
        throwAppError('DONATION_MAIN_ATTACHMENT_INVALID', {
          attachmentIds: input.attachmentIds,
        });
      }

      await this.replaceDonationPhotos(
        savedDonation.id,
        input.attachmentIds,
        mainAttachmentId,
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
