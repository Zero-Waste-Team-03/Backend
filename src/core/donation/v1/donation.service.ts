import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Donation,
  DonationUrgencyValues,
  DonationStatusValues,
  type DonationStatus,
  type DonationUrgency,
} from '../entities/donation.entity';
import { DeleteResult, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { CreateDonationInput } from '../graphql/inputs/create-donation.input';
import { UpdateDonationInput } from '../graphql/inputs/update-donation.input';
import { throwAppError } from 'src/common/errors';
import { DonationPhoto } from '../entities/donation-photo.entity';
import { DonationLike } from '../entities/donation-like.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { LocationInput } from 'src/common/locations/graphql/inputs/location.input';
import { DonationsFilterInput } from '../graphql/inputs/donations-filter.input';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';
import { SmartBehaviorPublisherService } from 'src/core/notifications/pubsub/smart-behavior-publisher.service';
import { DonationBehaviorContextInput } from '../graphql/inputs/donation-behavior-context.input';
import { DonationsMapInput } from '../graphql/inputs/donations-map.input';
import {
  MarkerColorValues,
  MarkerColor,
} from '../graphql/types/donation-map-marker.type';
import {
  CategorySensitivity,
  CategorySensitivityValues,
} from '../../category/entities/category.entity';
import {
  Reservation,
  ReservationStatusValues,
} from 'src/core/reservation/entities/reservation.entity';
import { User } from 'src/core/user/entities/user.entity';
import { DonationsHeatmapInput } from '../graphql/inputs/donations-heatmap.input';
import { DonationsHeatmapType } from '../graphql/types/donations-heatmap.type';
import { UsersDonationsStats } from '../graphql/types/donations-stats.type';

type DonationResponse = Omit<Donation, 'generateId'> & {
  attachmentIds: string[];
  mainAttachmentId?: string;
  isLikedByMe: boolean;
};

@Injectable()
export class DonationService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonationPhoto)
    private readonly donationPhotoRepository: Repository<DonationPhoto>,
    @InjectRepository(DonationLike)
    private readonly donationLikeRepository: Repository<DonationLike>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly smartBehaviorPublisher: SmartBehaviorPublisherService,
  ) {}

  async getDonationsHeatmap(
    input: DonationsHeatmapInput,
  ): Promise<DonationsHeatmapType> {
    const gridSize = input.gridSize ?? 0.01;
    const { northEast, southWest } = input.bounds;

    const dateFrom = input.dateRange?.from;
    const dateTo = input.dateRange?.to;

    const donationQuery = this.donationRepository
      .createQueryBuilder('donation')
      .innerJoin(Location, 'location', 'location.id = donation.locationId')
      .leftJoin('donation.category', 'category')
      .where('location.latitude BETWEEN :southLat AND :northLat', {
        southLat: southWest.latitude,
        northLat: northEast.latitude,
      })
      .andWhere('location.longitude BETWEEN :westLng AND :eastLng', {
        westLng: southWest.longitude,
        eastLng: northEast.longitude,
      })
      .andWhere('donation.status != :expiredStatus', {
        expiredStatus: DonationStatusValues.EXPIRED,
      })
      .select([
        'donation.id AS id',
        'donation.userId AS donorId',
        'donation.status AS status',
        'donation.categoryId AS categoryId',
        'donation.createdAt AS createdAt',
        'location.latitude AS latitude',
        'location.longitude AS longitude',
        'location.neighborhood AS neighborhood',
        'location.city AS city',
        'category.name AS categoryName',
      ]);

    if (dateFrom && dateTo) {
      donationQuery.andWhere(
        'donation.createdAt BETWEEN :dateFrom AND :dateTo',
        {
          dateFrom,
          dateTo,
        },
      );
    }

    if (input.categories?.length) {
      donationQuery.andWhere('donation.categoryId IN (:...categories)', {
        categories: input.categories,
      });
    }

    const donationRows = await donationQuery.getRawMany<{
      id: string;
      donorId: string;
      status: DonationStatus;
      categoryId: string;
      createdAt: Date;
      latitude: number;
      longitude: number;
      neighborhood: string | null;
      city: string | null;
      categoryName: string | null;
    }>();

    if (!donationRows.length) {
      return { cells: [], maxScore: 0, totalCells: 0 };
    }

    const donationIds = donationRows.map((row) => row.id);

    const reservationQuery = this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .innerJoin(Location, 'location', 'location.id = donation.locationId')
      .where('reservation.donationId IN (:...donationIds)', { donationIds })
      .andWhere('location.latitude BETWEEN :southLat AND :northLat', {
        southLat: southWest.latitude,
        northLat: northEast.latitude,
      })
      .andWhere('location.longitude BETWEEN :westLng AND :eastLng', {
        westLng: southWest.longitude,
        eastLng: northEast.longitude,
      })
      .andWhere('reservation.status != :cancelledStatus', {
        cancelledStatus: ReservationStatusValues.CANCELLED,
      })
      .select([
        'reservation.id AS id',
        'reservation.beneficiaryId AS beneficiaryId',
        'reservation.status AS status',
        'reservation.createdAt AS createdAt',
        'reservation.donationId AS donationId',
      ]);

    if (dateFrom && dateTo) {
      reservationQuery.andWhere(
        'reservation.createdAt BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    }

    const reservationRows = await reservationQuery.getRawMany<{
      id: string;
      beneficiaryId: string;
      status: Reservation['status'];
      createdAt: Date;
      donationId: string;
    }>();

    const activeFromDate = new Date();
    activeFromDate.setDate(activeFromDate.getDate() - 30);

    const activeUserRows = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin(Location, 'location', 'location.id = user.locationId')
      .where('location.latitude BETWEEN :southLat AND :northLat', {
        southLat: southWest.latitude,
        northLat: northEast.latitude,
      })
      .andWhere('location.longitude BETWEEN :westLng AND :eastLng', {
        westLng: southWest.longitude,
        eastLng: northEast.longitude,
      })
      .andWhere('user.createdAt >= :activeFromDate', { activeFromDate })
      .select([
        'user.id AS id',
        'location.latitude AS latitude',
        'location.longitude AS longitude',
      ])
      .getRawMany<{ id: string; latitude: number; longitude: number }>();

    type CellStats = {
      lat: number;
      lng: number;
      donationCount: number;
      completedCount: number;
      activeCount: number;
      reservationCount: number;
      uniqueUsers: Set<string>;
      categoryCounts: Map<string, number>;
      neighborhood: string | null;
      city: string | null;
    };

    const cells = new Map<string, CellStats>();
    const donationCellByDonationId = new Map<string, string>();

    const getCellKey = (latitude: number, longitude: number): string => {
      const lat = Math.floor(latitude / gridSize) * gridSize;
      const lng = Math.floor(longitude / gridSize) * gridSize;
      return `${lat.toFixed(6)}:${lng.toFixed(6)}`;
    };

    const ensureCell = (
      cellKey: string,
      lat: number,
      lng: number,
      neighborhood: string | null,
      city: string | null,
    ) => {
      if (cells.has(cellKey)) {
        return cells.get(cellKey)!;
      }

      const entry: CellStats = {
        lat,
        lng,
        donationCount: 0,
        completedCount: 0,
        activeCount: 0,
        reservationCount: 0,
        uniqueUsers: new Set<string>(),
        categoryCounts: new Map<string, number>(),
        neighborhood,
        city,
      };

      cells.set(cellKey, entry);
      return entry;
    };

    for (const row of donationRows) {
      const cellLat = Math.floor(row.latitude / gridSize) * gridSize;
      const cellLng = Math.floor(row.longitude / gridSize) * gridSize;
      const cellKey = `${cellLat.toFixed(6)}:${cellLng.toFixed(6)}`;
      donationCellByDonationId.set(row.id, cellKey);

      const cell = ensureCell(
        cellKey,
        cellLat,
        cellLng,
        row.neighborhood,
        row.city,
      );

      cell.donationCount += 1;
      cell.uniqueUsers.add(row.donorId);

      if (row.status === DonationStatusValues.COMPLETED) {
        cell.completedCount += 1;
      }

      if (
        row.status === DonationStatusValues.PUBLISHED ||
        row.status === DonationStatusValues.RESERVED
      ) {
        cell.activeCount += 1;
      }

      if (row.categoryName) {
        const currentCount = cell.categoryCounts.get(row.categoryName) ?? 0;
        cell.categoryCounts.set(row.categoryName, currentCount + 1);
      }
    }

    for (const row of reservationRows) {
      const cellKey = donationCellByDonationId.get(row.donationId);
      if (!cellKey) {
        continue;
      }

      const cell = cells.get(cellKey);
      if (!cell) {
        continue;
      }

      cell.reservationCount += 1;
      cell.uniqueUsers.add(row.beneficiaryId);
    }

    for (const userRow of activeUserRows) {
      const cellKey = getCellKey(userRow.latitude, userRow.longitude);
      const cellLat = Math.floor(userRow.latitude / gridSize) * gridSize;
      const cellLng = Math.floor(userRow.longitude / gridSize) * gridSize;

      const cell = ensureCell(cellKey, cellLat, cellLng, null, null);
      cell.uniqueUsers.add(userRow.id);
    }

    const rawCells = Array.from(cells.values()).map((cell) => {
      const userCount = cell.uniqueUsers.size;
      const rawScore =
        cell.completedCount * 0.5 +
        cell.activeCount * 0.25 +
        userCount * 0.15 +
        cell.reservationCount * 0.1;

      let topCategory: string | null = null;
      let topCategoryCount = 0;
      for (const [categoryName, count] of cell.categoryCounts.entries()) {
        if (count > topCategoryCount) {
          topCategory = categoryName;
          topCategoryCount = count;
        }
      }

      return {
        lat: cell.lat,
        lng: cell.lng,
        rawScore,
        donationCount: cell.donationCount,
        completedCount: cell.completedCount,
        activeCount: cell.activeCount,
        userCount,
        reservationCount: cell.reservationCount,
        topCategory,
        neighborhood: cell.neighborhood,
        city: cell.city,
      };
    });

    rawCells.sort((a, b) => b.rawScore - a.rawScore);
    const limitedCells = rawCells.slice(0, 500);
    const maxScore = limitedCells.reduce(
      (max, cell) => (cell.rawScore > max ? cell.rawScore : max),
      0,
    );

    return {
      cells: limitedCells.map((cell) => ({
        ...cell,
        score: maxScore > 0 ? Number((cell.rawScore / maxScore).toFixed(4)) : 0,
      })),
      maxScore,
      totalCells: limitedCells.length,
    };
  }

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

  //TODO: TO modify urgently
  private buildUpdatePatch(input: UpdateDonationInput): Partial<Donation> {
    const patch: Partial<Donation> = {};

    if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.quantity !== undefined) patch.quantity = input.quantity;
    if (input.foodWeightKg !== undefined)
      patch.foodWeightKg = input.foodWeightKg;
    if (input.specification !== undefined)
      patch.specification = input.specification;
    if (input.urgency !== undefined)
      patch.urgency = input.urgency as DonationUrgency;
    if (input.safetyChecklistCompleted !== undefined) {
      patch.safetyChecklistCompleted = input.safetyChecklistCompleted;
    }

    return patch;
  }

  /**
   * Determines the color of a map marker based on category sensitivity.
   * @param sensitivity The sensitivity level of the category.
   * @returns The corresponding MarkerColor.
   * @private
   */
  private getMarkerColor(sensitivity: CategorySensitivity): MarkerColor {
    if (sensitivity === CategorySensitivityValues.LOW) {
      return MarkerColorValues.GREEN;
    }
    if (sensitivity === CategorySensitivityValues.MEDIUM) {
      return MarkerColorValues.ORANGE;
    }
    return MarkerColorValues.RED;
  }
  private async buildDonationResponses(
    donations: Donation[],
    viewerUserId?: string,
    options?: {
      skipLikesLookup?: boolean;
      forceIsLikedByMe?: boolean;
    },
  ): Promise<DonationResponse[]> {
    if (!donations.length) {
      return [];
    }

    const donationIds = donations.map((donation) => donation.id);
    const allPhotos = await this.donationPhotoRepository.find({
      where: { donationId: In(donationIds) },
    });

    const photoMap = allPhotos.reduce(
      (acc, photo) => {
        if (!acc[photo.donationId]) {
          acc[photo.donationId] = [];
        }
        acc[photo.donationId].push(photo);
        return acc;
      },
      {} as Record<string, DonationPhoto[]>,
    );

    let likedDonationIds = new Set<string>();
    if (viewerUserId && !options?.skipLikesLookup) {
      const likes = await this.donationLikeRepository.find({
        where: {
          userId: viewerUserId,
          donationId: In(donationIds),
        },
        select: ['donationId'],
      });
      likedDonationIds = new Set(likes.map((like) => like.donationId));
    }

    return donations.map((donation) => {
      const photos = photoMap[donation.id] || [];
      const isLikedByMe = options?.forceIsLikedByMe
        ? true
        : likedDonationIds.has(donation.id);

      return {
        ...donation,
        attachmentIds: photos.map((photo) => photo.attachmentId),
        mainAttachmentId: photos.find((photo) => photo.isMain)?.attachmentId,
        isLikedByMe,
      };
    });
  }

  async getDonationById(
    id: string,
    viewerUserId?: string,
  ): Promise<DonationResponse> {
    const donation = await this.donationRepository.findOne({ where: { id } });

    if (!donation) {
      throwAppError('DONATION_NOT_FOUND', { id });
    }

    return await this.mapDonationResponse(donation, viewerUserId);
  }

  async findByIds(
    ids: string[],
    viewerUserId?: string,
  ): Promise<DonationResponse[]> {
    const donations = await this.donationRepository.find({
      where: { id: In(ids) },
    });

    return this.buildDonationResponses(donations, viewerUserId);
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
    viewerUserId?: string,
  ): Promise<DonationResponse> {
    const [mapped] = await this.buildDonationResponses(
      [donation],
      viewerUserId,
    );
    return mapped;
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
      foodWeightKg: input.foodWeightKg,
      specification: input.specification ?? {},
      expiryDate: input.expiryDate,
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

    await this.smartBehaviorPublisher.safePublishDonationPublished({
      donorId: userId,
      donationId: savedDonation.id,
      categoryId: savedDonation.categoryId,
      category: savedDonation.category?.name ?? '',
      donationTitle:savedDonation.title,
      urgency: savedDonation.urgency,
      safetyChecklistCompleted: savedDonation.safetyChecklistCompleted,
    });

    return await this.mapDonationResponse(savedDonation, userId);
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
      donation.expiryDate = input.expiryDate;
    }

    if (input.listingExpiresAt) {
      donation.listingExpiresAt = input.listingExpiresAt;
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

    return await this.mapDonationResponse(savedDonation, userId);
  }

  async likeDonation(donationId: string, userId: string) {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      select: ['id', 'userId'],
    });

    if (!donation) {
      throwAppError('DONATION_NOT_FOUND', { id: donationId });
    }

    if (donation.userId === userId) {
      throwAppError('DONATION_LIKE_TARGET_INVALID', { id: donationId });
    }

    await this.donationLikeRepository
      .createQueryBuilder()
      .insert()
      .into(DonationLike)
      .values({ donationId, userId })
      .orIgnore()
      .execute();

    await this.smartBehaviorPublisher.publishLikedDonation({
      donationId: donation.id,
      likerUserId: userId,
    });

    return { message: 'Donation liked successfully' };
  }

  async unlikeDonation(donationId: string, userId: string) {
  
    await this.donationLikeRepository.delete({ donationId, userId });
    return { message: 'Donation unliked successfully' };
  }

  async findLikedDonations(
    userId: string,
    filter?: DonationsFilterInput,
    pagination?: PaginationInput,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const query = this.donationRepository
      .createQueryBuilder('donation')
      .innerJoin(
        DonationLike,
        'donation_like',
        'donation_like.donationId = donation.id AND donation_like.userId = :userId',
        { userId },
      )
  .addSelect('donation_like.createdAt', 'donation_like_createdat') 
      .orderBy('donation_like_createdat', 'DESC').skip(skip).take(limit);
      
    if (filter?.categoryId) {
      query.andWhere('donation.categoryId = :categoryId', {
        categoryId: filter.categoryId,
      });
    }

    if (filter?.urgency) {
      query.andWhere('donation.urgency = :urgency', {
        urgency: filter.urgency,
      });
    }

    if (filter?.status) {
      query.andWhere('donation.status = :status', { status: filter.status });
    }

    const [donations, totalCount] = await query.getManyAndCount();
    const items = await this.buildDonationResponses(donations, userId, {
      skipLikesLookup: true,
      forceIsLikedByMe: true,
    });

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async deleteDonation(id: string, userId: string, isAdmin: boolean) {
    let result: DeleteResult;
    if (isAdmin) {
      result = await this.donationRepository.delete({ id });
    } else {
      result = await this.donationRepository.delete({ id, userId });
    }

    if (!result.affected) {
      throwAppError('DONATION_NOT_FOUND', { id });
    }

    return { message: 'Donation deleted successfully' };
  }

  async getStatistics() {
    const [totalActiveDonations, flaggedItems, pendingApprovals] =
      await Promise.all([
        this.donationRepository.count({
          where: { status: DonationStatusValues.PUBLISHED as DonationStatus },
        }),
        this.donationRepository.count({
          where: { urgency: DonationUrgencyValues.HIGH as DonationUrgency },
        }),
        this.donationRepository.count({
          where: { status: DonationStatusValues.DRAFT as DonationStatus },
        }),
      ]);

    return {
      totalActiveDonations,
      flaggedItems,
      pendingApprovals,
    };
  }
  async getMyDonations(userId:string,filer?:DonationsFilterInput,pagination?:PaginationInput){
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Donation> = {userId:userId};

    if (filer?.categoryId) where.categoryId = filer.categoryId;
    if (filer?.urgency) where.urgency = filer.urgency;
    if (filer?.status) where.status = filer.status;

    const [donations, totalCount] = await this.donationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    const items = await this.buildDonationResponses(donations, userId,{skipLikesLookup:true});
    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async findAll(
    userId: string,
    filter?: DonationsFilterInput,
    behaviorContext?: DonationBehaviorContextInput,
    pagination?: PaginationInput,
    isAdmin: boolean = false,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Donation> = {};
    if (!isAdmin) {
      where.userId = Not(userId);
      where.status = DonationStatusValues.PUBLISHED as DonationStatus;
    }

    if (filter?.categoryId) where.categoryId = filter.categoryId;
    if (filter?.urgency) where.urgency = filter.urgency;
    if (filter?.status) where.status = filter.status;

    const [donations, totalCount] = await this.donationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const items = await this.buildDonationResponses(donations, userId);

    const hasBehaviorSignal =
      Boolean(filter?.categoryId) ||
      Boolean(filter?.urgency) ||
      Boolean(filter?.status) ||
      Boolean(behaviorContext?.distanceBucket) ||
      Boolean(behaviorContext?.origin);

    if (hasBehaviorSignal) {
      await this.smartBehaviorPublisher.safePublishBeneficiarySearchPerformed({
        userId,
        categoryId: filter?.categoryId,
        urgency: filter?.urgency,
        distanceBucket: behaviorContext?.distanceBucket,
        origin: behaviorContext?.origin,
      });
    }

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async getDonationsForMap(input: DonationsMapInput, userId?: string) {
    const { radius, latitude, longitude } = input;

    const donations = await this.donationRepository
      .createQueryBuilder('donation')
      .innerJoinAndSelect('donation.location', 'location')
      .innerJoinAndSelect('donation.category', 'category')
      .leftJoinAndSelect('donation.photos', 'photos', 'photos.isMain = true')
      .where('donation.status = :status', {
        status: DonationStatusValues.PUBLISHED,
      })
      .andWhere(
        '(6371 * acos(cos(radians(:latitude)) * cos(radians(location.latitude)) * cos(radians(location.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(location.latitude)))) <= :radius',
        { latitude, longitude, radius },
      )
      .getMany();

    const donationIds = donations.map((donation) => donation.id);
    let likedDonationIds = new Set<string>();

    if (userId && donationIds.length) {
      const likes = await this.donationLikeRepository.find({
        where: {
          userId,
          donationId: In(donationIds),
        },
        select: ['donationId'],
      });
      likedDonationIds = new Set(likes.map((like) => like.donationId));
    }

    return donations.map((donation) => {
      const markerColor = this.getMarkerColor(
        donation.category?.sensitivity ?? CategorySensitivityValues.LOW,
      );

      return {
        id: donation.id,
        title: donation.title,
        latitude: donation.location!.latitude!,
        longitude: donation.location!.longitude!,
        markerColor,
        urgency: donation.urgency,
        categoryId: donation.categoryId,
        mainAttachmentId: donation.photos?.[0]?.attachmentId,
        donation: {
          ...donation,
          attachmentIds: donation.photos?.map((p) => p.attachmentId) || [],
          mainAttachmentId: donation.photos?.find((p) => p.isMain)
            ?.attachmentId,
          isLikedByMe: likedDonationIds.has(donation.id),
        },
      };
    });
  }
  async getUsersDonationsStats(userId:string):Promise<UsersDonationsStats>{
    const [ totalDonations,likedDonations  ]= await Promise.all( [ this.donationRepository.count({where:{userId}}) ,this.donationLikeRepository.count({
      where:{userId}
    })
    ] );
    return {
      totalDonations,
      likedDonations}
    }
}
