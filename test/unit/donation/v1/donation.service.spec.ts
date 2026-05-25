import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DonationService } from 'src/core/donation/v1/donation.service';
import {
  Donation,
  DonationUrgencyValues,
  DonationStatusValues,
} from 'src/core/donation/entities/donation.entity';
import { DonationPhoto } from 'src/core/donation/entities/donation-photo.entity';
import { DonationLike } from 'src/core/donation/entities/donation-like.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { Reservation } from 'src/core/reservation/entities/reservation.entity';
import { User } from 'src/core/user/entities/user.entity';

import { SmartBehaviorPublisherService } from 'src/core/notifications/pubsub/smart-behavior-publisher.service';

import { In } from 'typeorm';
import { MarkerColorValues } from 'src/core/donation/graphql/types/donation-map-marker.type';
import { UsersDonationsStats } from 'src/core/donation/graphql/types/donations-stats.type';

describe('DonationService', () => {
  let service: DonationService;

  const donationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const donationPhotoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
  };

  const locationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const donationLikeRepository = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
  };

  const reservationRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const userRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const smartBehaviorPublisher = {
    safePublishBeneficiarySearchPerformed: jest.fn(),
    safePublishDonationPublished: jest.fn(),
    publishLikedDonation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationService,
        {
          provide: getRepositoryToken(Donation),
          useValue: donationRepository,
        },
        {
          provide: getRepositoryToken(DonationPhoto),
          useValue: donationPhotoRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: locationRepository,
        },
        {
          provide: getRepositoryToken(DonationLike),
          useValue: donationLikeRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: SmartBehaviorPublisherService,
          useValue: smartBehaviorPublisher,
        },
      ],
    }).compile();

    service = module.get<DonationService>(DonationService);
    donationLikeRepository.find.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDonation', () => {
    it('creates donation with authenticated owner and published status when verified', async () => {
      const input = {
        categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
        title: 'Bread packs',
        description: 'Fresh bread packs from the bakery',
        quantity: 12,
        foodWeightKg: 6,
        specification: { packaging: 'paper bags' },
        expiryDate: new Date('2030-01-01T10:00:00.000Z'),
        urgency: DonationUrgencyValues.MEDIUM,
        safetyChecklistCompleted: false,
        attachmentIds: ['fb995c73-55ed-4511-bec5-8f930f2328d5'],
        mainAttachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
      };

      const createdEntity = {
        id: 'd1',
        ...input,
        userId: 'u1',
        status: DonationStatusValues.PUBLISHED,
      };

      userRepository.findOne.mockResolvedValue({ id: 'u1', isVerified: true });
      donationRepository.create.mockReturnValue(createdEntity);
      donationRepository.save.mockResolvedValue(createdEntity);
      donationPhotoRepository.create.mockImplementation((entity) => entity);
      donationPhotoRepository.save.mockResolvedValue(undefined);
      locationRepository.create.mockImplementation((entity) => entity);
      locationRepository.save.mockResolvedValue({
        id: 'loc-1',
        city: 'Algiers',
        country: 'Algeria',
      });
      donationPhotoRepository.find.mockResolvedValue([
        {
          donationId: 'd1',
          attachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
          isMain: true,
        },
      ]);

      const result = await service.createDonation(input, {
        userId: 'u1',
        isAdmin: false,
        isVerified: true,
      });

      expect(donationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          quantity: input.quantity,
          specification: input.specification,
          expiryDate: input.expiryDate,
          userId: 'u1',
          status: DonationStatusValues.PUBLISHED,
          urgency: DonationUrgencyValues.MEDIUM,
          safetyChecklistCompleted: false,
        }),
      );
      expect(donationRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(
        smartBehaviorPublisher.safePublishDonationPublished,
      ).toHaveBeenCalledWith({
        donorId: 'u1',
        donationId: createdEntity.id,
        categoryId: createdEntity.categoryId,
        donationTitle: createdEntity.title,
        category: '',
        urgency: createdEntity.urgency,
        safetyChecklistCompleted: createdEntity.safetyChecklistCompleted,
      });
      expect(result).toEqual(
        expect.objectContaining({
          ...createdEntity,
          attachmentIds: ['fb995c73-55ed-4511-bec5-8f930f2328d5'],
          mainAttachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
        }),
      );
    });

    it('creates donation with only mainAttachmentId', async () => {
      const input = {
        categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
        title: 'No image donation',
        description: 'Donation without media',
        quantity: 3,
        foodWeightKg: 1.5,
        specification: { note: 'text only' },
        expiryDate: new Date('2030-01-01T10:00:00.000Z'),
        urgency: DonationUrgencyValues.LOW,
        safetyChecklistCompleted: true,
        mainAttachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
      };

      const createdEntity = {
        id: 'd-no-attachment',
        ...input,
        userId: 'u1',
        status: DonationStatusValues.PUBLISHED,
      };

      userRepository.findOne.mockResolvedValue({ id: 'u1', isVerified: true });
      donationRepository.create.mockReturnValue(createdEntity);
      donationRepository.save.mockResolvedValue(createdEntity);
      donationPhotoRepository.create.mockImplementation((entity) => entity);
      donationPhotoRepository.save.mockResolvedValue(undefined);
      donationPhotoRepository.find.mockResolvedValue([
        {
          donationId: 'd-no-attachment',
          attachmentId: input.mainAttachmentId,
          isMain: true,
        },
      ]);

      const result = await service.createDonation(input, {
        userId: 'u1',
        isAdmin: false,
        isVerified: true,
      });

      expect(donationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          quantity: input.quantity,
          specification: input.specification,
          expiryDate: input.expiryDate,
          userId: 'u1',
          status: DonationStatusValues.PUBLISHED,
          urgency: DonationUrgencyValues.LOW,
          safetyChecklistCompleted: true,
        }),
      );
      expect(donationPhotoRepository.create).toHaveBeenCalledWith({
        donationId: createdEntity.id,
        attachmentId: input.mainAttachmentId,
        isMain: true,
      });
      expect(result).toEqual(
        expect.objectContaining({
          ...createdEntity,
          attachmentIds: [input.mainAttachmentId],
          mainAttachmentId: input.mainAttachmentId,
        }),
      );
    });

    it('throws BadRequestException when attachment ids are duplicated', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'u1', isVerified: true });
      await expect(
        service.createDonation(
          {
            categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
            title: 'Dup photos',
            description: 'Duplicate ids',
            quantity: 2,
            foodWeightKg: 1,
            specification: {},
            expiryDate: new Date('2030-01-01T10:00:00.000Z'),
            urgency: DonationUrgencyValues.LOW,
            safetyChecklistCompleted: false,
            attachmentIds: [
              'a1111111-1111-1111-1111-111111111111',
              'a1111111-1111-1111-1111-111111111111',
            ],
            mainAttachmentId: 'a1111111-1111-1111-1111-111111111111',
          },
          { userId: 'u1', isAdmin: false, isVerified: true },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates donation from locationInput when locationId is not provided', async () => {
      const input = {
        categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
        title: 'Location input donation',
        description: 'Created with inline location payload',
        quantity: 2,
        foodWeightKg: 1,
        specification: {},
        expiryDate: new Date('2030-01-01T10:00:00.000Z'),
        urgency: DonationUrgencyValues.MEDIUM,
        safetyChecklistCompleted: true,
        locationInput: {
          city: 'Algiers',
          country: 'Algeria',
        },
        mainAttachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
      };

      const createdEntity = {
        id: 'd-location-input',
        userId: 'u1',
        status: DonationStatusValues.PUBLISHED,
        ...input,
      };

      userRepository.findOne.mockResolvedValue({ id: 'u1', isVerified: true });
      locationRepository.create.mockImplementation((entity) => entity);
      locationRepository.save.mockResolvedValue({
        id: 'loc-created',
        ...input.locationInput,
      });
      donationRepository.create.mockReturnValue(createdEntity);
      donationRepository.save.mockResolvedValue(createdEntity);
      donationPhotoRepository.create.mockImplementation((entity) => entity);
      donationPhotoRepository.save.mockResolvedValue(undefined);
      donationPhotoRepository.find.mockResolvedValue([
        {
          donationId: 'd-location-input',
          attachmentId: input.mainAttachmentId,
          isMain: true,
        },
      ]);

      await service.createDonation(input, {
        userId: 'u1',
        isAdmin: false,
        isVerified: true,
      });

      expect(locationRepository.create).toHaveBeenCalledWith(
        input.locationInput,
      );
      expect(locationRepository.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when locationId and locationInput are both provided', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'u1', isVerified: true });
      await expect(
        service.createDonation(
          {
            categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
            title: 'Location xor',
            description: 'Invalid location payload',
            quantity: 3,
            foodWeightKg: 1.5,
            specification: {},
            expiryDate: new Date('2030-01-01T10:00:00.000Z'),
            urgency: DonationUrgencyValues.MEDIUM,
            safetyChecklistCompleted: false,
            locationId: 'd40d9c73-92fd-43cf-a4da-308f8f4ea945',
            locationInput: {
              city: 'Algiers',
              country: 'Algeria',
            },
            mainAttachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
          },
          { isVerified: false, isAdmin: false, userId: 'u1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates donation with pending approval status when user is not verified', async () => {
      const input = {
        categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
        title: 'Pending donation',
        description: 'Needs approval',
        quantity: 2,
        foodWeightKg: 1,
        specification: {},
        expiryDate: new Date('2030-01-01T10:00:00.000Z'),
        urgency: DonationUrgencyValues.LOW,
        safetyChecklistCompleted: false,
        mainAttachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
      };

      const createdEntity = {
        id: 'd-pending',
        ...input,
        userId: 'u1',
        status: DonationStatusValues.PENDING_APPROVAL,
      };

      userRepository.findOne.mockResolvedValue({ id: 'u1', isVerified: false });
      donationRepository.create.mockReturnValue(createdEntity);
      donationRepository.save.mockResolvedValue(createdEntity);
      donationPhotoRepository.create.mockImplementation((entity) => entity);
      donationPhotoRepository.save.mockResolvedValue(undefined);
      donationPhotoRepository.find.mockResolvedValue([
        {
          donationId: 'd-pending',
          attachmentId: input.mainAttachmentId,
          isMain: true,
        },
      ]);

      const result = await service.createDonation(input, {
        userId: 'u1',
        isAdmin: false,
        isVerified: false,
      });

      expect(donationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DonationStatusValues.PENDING_APPROVAL,
        }),
      );
      expect(
        smartBehaviorPublisher.safePublishDonationPublished,
      ).not.toHaveBeenCalled();
      expect(result.status).toBe(DonationStatusValues.PENDING_APPROVAL);
    });
  });

  describe('updateDonation', () => {
    it('updates donation when owner matches', async () => {
      const existingDonation = {
        id: 'd1',
        userId: 'u1',
        title: 'Old title',
        urgency: DonationUrgencyValues.MEDIUM,
        safetyChecklistCompleted: false,
      };
      donationRepository.findOne.mockResolvedValue(existingDonation);
      donationRepository.save.mockImplementation(async (entity) => entity);
      donationPhotoRepository.find.mockResolvedValue([]);

      const result = await service.updateDonation(
        'd1',
        { title: 'New title', quantity: 5 },
        'u1',
      );

      expect(donationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'd1', userId: 'u1' },
      });
      expect(result.title).toBe('New title');
      expect(result.quantity).toBe(5);
    });

    it('updates main attachment from existing photos', async () => {
      const existingDonation = {
        id: 'd1',
        userId: 'u1',
        title: 'Old title',
        urgency: DonationUrgencyValues.MEDIUM,
        safetyChecklistCompleted: false,
      };
      donationRepository.findOne.mockResolvedValue(existingDonation);
      donationRepository.save.mockImplementation(async (entity) => entity);
      donationPhotoRepository.find.mockResolvedValue([
        { donationId: 'd1', attachmentId: 'a1', isMain: true },
        { donationId: 'd1', attachmentId: 'a2', isMain: false },
      ]);
      donationPhotoRepository.merge.mockImplementation((entity, patch) => ({
        ...entity,
        ...patch,
      }));

      await service.updateDonation('d1', { mainAttachmentId: 'a2' }, 'u1');

      expect(donationPhotoRepository.save).toHaveBeenCalledWith([
        { donationId: 'd1', attachmentId: 'a1', isMain: false },
        { donationId: 'd1', attachmentId: 'a2', isMain: true },
      ]);
    });

    it('clears location when locationId is explicitly null', async () => {
      const existingDonation = {
        id: 'd1',
        userId: 'u1',
        title: 'Old title',
        locationId: 'loc-1',
        urgency: DonationUrgencyValues.MEDIUM,
        safetyChecklistCompleted: false,
      };
      donationRepository.findOne.mockResolvedValue(existingDonation);
      donationRepository.save.mockImplementation(async (entity) => entity);
      donationPhotoRepository.find.mockResolvedValue([]);

      const result = await service.updateDonation(
        'd1',
        { locationId: null },
        'u1',
      );

      expect(result.locationId).toBeNull();
    });

    it('throws when both locationId and locationInput are provided on update', async () => {
      const existingDonation = {
        id: 'd1',
        userId: 'u1',
        title: 'Old title',
        urgency: DonationUrgencyValues.MEDIUM,
        safetyChecklistCompleted: false,
      };
      donationRepository.findOne.mockResolvedValue(existingDonation);

      await expect(
        service.updateDonation(
          'd1',
          {
            locationId: 'd40d9c73-92fd-43cf-a4da-308f8f4ea945',
            locationInput: { city: 'Algiers', country: 'Algeria' },
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when donation is not owned or missing', async () => {
      donationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateDonation('d404', { title: 'x' }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteDonation', () => {
    it('deletes donation when owner matches', async () => {
      donationRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteDonation('d1', 'u1', false);

      expect(donationRepository.delete).toHaveBeenCalledWith({
        id: 'd1',
        userId: 'u1',
      });
      expect(result).toEqual({ message: 'Donation deleted successfully' });
    });

    it('throws NotFoundException when donation is not owned or missing', async () => {
      donationRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.deleteDonation('d404', 'u1', false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
  describe('getStatistics', () => {
    it('returns Current users donations statistics', async () => {
      const stats: UsersDonationsStats = {
        totalDonations: 20,
        likedDonations: 5,
      };
      donationRepository.count.mockImplementation((options) => {
        if (options.where.userId === 'u1') return 20;
      });
      donationLikeRepository.count.mockImplementation((options) => {
        if (options.where.userId === 'u1') return 5;
      });
      const result = await service.getUsersDonationsStats('u1');
      expect(result).toEqual(stats);
      expect(donationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      expect(donationLikeRepository.count).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
    });
    it('returns correct counts for active, flagged and pending donations', async () => {
      donationRepository.count.mockImplementation((options) => {
        if (options.where.status === DonationStatusValues.PUBLISHED) return 10;
        if (options.where.urgency === DonationUrgencyValues.HIGH) return 2;
        if (options.where.status === DonationStatusValues.PENDING_APPROVAL)
          return 5;
        return 0;
      });

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalActiveDonations: 10,
        flaggedItems: 2,
        pendingApprovals: 5,
      });
      expect(donationRepository.count).toHaveBeenCalledTimes(3);
    });
  });

  describe('findAll', () => {
    it('returns paginated items and metadata', async () => {
      const mockDonations = [
        { id: 'd1', title: 'Donation 1', userId: 'u2' },
        { id: 'd2', title: 'Donation 2', userId: 'u2' },
      ];
      donationRepository.findAndCount.mockResolvedValue([mockDonations, 2]);
      reservationRepository.find.mockResolvedValue([]);
      donationPhotoRepository.find.mockResolvedValue([]);

      const filter = { categoryId: 'cat1' };
      const pagination = { page: 2, limit: 10 };

      const result = await service.findAll('u1', filter, undefined, pagination);

      expect(result.totalCount).toBe(2);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
      expect(
        smartBehaviorPublisher.safePublishBeneficiarySearchPerformed,
      ).toHaveBeenCalledWith({
        userId: 'u1',
        categoryId: 'cat1',
        urgency: undefined,
        distanceBucket: undefined,
        origin: undefined,
      });
    });
  });

  describe('findByIds', () => {
    it('returns donations for given ids with mapped photos using In operator', async () => {
      const ids = ['d1', 'd2'];
      const mockDonations = [
        { id: 'd1', title: 'Donation 1' },
        { id: 'd2', title: 'Donation 2' },
      ];
      donationRepository.find.mockResolvedValue(mockDonations);
      donationPhotoRepository.find.mockResolvedValue([
        { donationId: 'd1', attachmentId: 'a1', isMain: true },
      ]);

      const result = await service.findByIds(ids);

      expect(donationRepository.find).toHaveBeenCalledWith({
        where: { id: In(ids) },
      });
      expect(donationPhotoRepository.find).toHaveBeenCalled();
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'd1',
          attachmentIds: ['a1'],
          mainAttachmentId: 'a1',
        }),
      );
      expect(result[1].attachmentIds).toEqual([]);
      expect(result[0].isLikedByMe).toBe(false);
    });

    it('returns isLikedByMe=true when viewer user has liked donations', async () => {
      const ids = ['d1'];
      donationRepository.find.mockResolvedValue([
        { id: 'd1', title: 'Donation 1' },
      ]);
      donationPhotoRepository.find.mockResolvedValue([]);
      donationLikeRepository.find.mockResolvedValue([{ donationId: 'd1' }]);

      const result = await service.findByIds(ids, 'u-viewer');

      expect(donationLikeRepository.find).toHaveBeenCalledWith({
        where: { userId: 'u-viewer', donationId: In(ids) },
        select: ['donationId'],
      });
      expect(result[0].isLikedByMe).toBe(true);
    });
  });

  describe('findLikedDonations optimization', () => {
    it('does not trigger likes lookup when list is already scoped to liked rows', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'd1' }], 1]),
      };

      donationRepository.createQueryBuilder.mockReturnValue(qb);
      donationPhotoRepository.find.mockResolvedValue([]);

      await service.findLikedDonations('u1', undefined, { page: 1, limit: 10 });

      expect(donationLikeRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('likeDonation', () => {
    it('likes donation when donation exists and is not owned by user', async () => {
      const insertBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      donationRepository.findOne.mockResolvedValue({
        id: 'd1',
        userId: 'u-owner',
      });
      donationLikeRepository.createQueryBuilder.mockReturnValue(insertBuilder);

      const result = await service.likeDonation('d1', 'u-viewer');

      expect(result).toEqual({ message: 'Donation liked successfully' });
      expect(donationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'd1' },
        select: ['id', 'userId'],
      });
      expect(insertBuilder.values).toHaveBeenCalledWith({
        donationId: 'd1',
        userId: 'u-viewer',
      });
      expect(smartBehaviorPublisher.publishLikedDonation).toHaveBeenCalledWith({
        donationId: 'd1',
        likerUserId: 'u-viewer',
      });
    });

    it('throws BadRequestException when user likes own donation', async () => {
      donationRepository.findOne.mockResolvedValue({
        id: 'd1',
        userId: 'u1',
      });

      await expect(service.likeDonation('d1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFoundException when donation does not exist', async () => {
      donationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.likeDonation('missing', 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('unlikeDonation', () => {
    it('deletes like relation and returns success message', async () => {
      donationLikeRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.unlikeDonation('d1', 'u1');

      expect(donationLikeRepository.delete).toHaveBeenCalledWith({
        donationId: 'd1',
        userId: 'u1',
      });
      expect(result).toEqual({ message: 'Donation unliked successfully' });
    });
  });

  describe('findLikedDonations', () => {
    it('returns liked donations with same filter contract and liked flag', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'd1',
              title: 'Donation 1',
              userId: 'owner-1',
            },
          ],
          1,
        ]),
      };

      donationRepository.createQueryBuilder.mockReturnValue(qb);
      donationPhotoRepository.find.mockResolvedValue([
        { donationId: 'd1', attachmentId: 'a1', isMain: true },
      ]);
      donationLikeRepository.find.mockResolvedValue([{ donationId: 'd1' }]);

      const result = await service.findLikedDonations(
        'u1',
        {
          categoryId: 'cat1',
          urgency: DonationUrgencyValues.HIGH,
          status: DonationStatusValues.PUBLISHED,
        },
        { page: 1, limit: 10 },
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'donation.categoryId = :categoryId',
        { categoryId: 'cat1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('donation.urgency = :urgency', {
        urgency: DonationUrgencyValues.HIGH,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('donation.status = :status', {
        status: DonationStatusValues.PUBLISHED,
      });
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'd1',
          isLikedByMe: true,
          mainAttachmentId: 'a1',
        }),
      );
      expect(result.totalCount).toBe(1);
      expect(donationLikeRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('getDonationById', () => {
    it('returns donation with isLikedByMe=true for liked donation', async () => {
      donationRepository.findOne.mockResolvedValue({
        id: 'd1',
        title: 'Donation 1',
        status: DonationStatusValues.PUBLISHED,
      });
      donationPhotoRepository.find.mockResolvedValue([]);
      donationLikeRepository.find.mockResolvedValue([{ donationId: 'd1' }]);

      const result = await service.getDonationById('d1', 'u1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'd1',
          isLikedByMe: true,
        }),
      );
    });
  });

  describe('getDonationsForMap', () => {
    it('should return mapped donation markers with correct colors based on urgency and category', async () => {
      const input = { radius: 10, latitude: 36.7, longitude: 3.0 };
      const mockDonations = [
        {
          id: 'd1',
          title: 'Produce 1',
          urgency: DonationUrgencyValues.MEDIUM,
          categoryId: 'cat1',
          location: { latitude: 36.71, longitude: 3.01 },
          category: { name: 'Fresh Produce', sensitivity: 'Low' },
          photos: [{ attachmentId: 'a1', isMain: true }],
        },
        {
          id: 'd2',
          title: 'Bakery 1',
          urgency: DonationUrgencyValues.MEDIUM,
          categoryId: 'cat2',
          location: { latitude: 36.72, longitude: 3.02 },
          category: { name: 'Bakery', sensitivity: 'Medium' },
          photos: [{ attachmentId: 'a2', isMain: true }],
        },
        {
          id: 'd3',
          title: 'Urgent 1',
          urgency: DonationUrgencyValues.HIGH,
          categoryId: 'cat3',
          location: { latitude: 36.73, longitude: 3.03 },
          category: { name: 'Beverages', sensitivity: 'High' },
          photos: [{ attachmentId: 'a3', isMain: true }],
        },
      ];

      donationRepository.find.mockResolvedValue(mockDonations);

      const result = await service.getDonationsForMap(input);

      expect(donationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DonationStatusValues.PUBLISHED,
          }),
        }),
      );

      expect(result).toHaveLength(3);
      // Produce 1 -> GREEN (default)
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'd1',
          markerColor: MarkerColorValues.GREEN,
        }),
      );
      // Bakery 1 -> ORANGE (category match)
      expect(result[1]).toEqual(
        expect.objectContaining({
          id: 'd2',
          markerColor: MarkerColorValues.ORANGE,
        }),
      );
      // Urgent 1 -> RED (urgency HIGH)
      expect(result[2]).toEqual(
        expect.objectContaining({
          id: 'd3',
          markerColor: MarkerColorValues.RED,
        }),
      );
    });
  });
});
