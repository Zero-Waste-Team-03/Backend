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

describe('DonationService', () => {
  let service: DonationService;

  const donationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const donationPhotoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
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
      ],
    }).compile();

    service = module.get<DonationService>(DonationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDonation', () => {
    it('creates donation with authenticated owner and default status', async () => {
      const input = {
        categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
        title: 'Bread packs',
        description: 'Fresh bread packs from the bakery',
        quantity: 12,
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
        status: DonationStatusValues.DRAFT,
      };

      donationRepository.create.mockReturnValue(createdEntity);
      donationRepository.save.mockResolvedValue(createdEntity);
      donationPhotoRepository.create.mockImplementation((entity) => entity);
      donationPhotoRepository.save.mockResolvedValue(undefined);
      donationPhotoRepository.find.mockResolvedValue([
        {
          donationId: 'd1',
          attachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
          isMain: true,
        },
      ]);

      const result = await service.createDonation(input, 'u1');

      expect(donationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          quantity: input.quantity,
          specification: input.specification,
          expiryDate: input.expiryDate,
          userId: 'u1',
          status: DonationStatusValues.DRAFT,
          urgency: DonationUrgencyValues.MEDIUM,
          safetyChecklistCompleted: false,
        }),
      );
      expect(donationRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(
        expect.objectContaining({
          ...createdEntity,
          attachmentIds: ['fb995c73-55ed-4511-bec5-8f930f2328d5'],
          mainAttachmentId: 'fb995c73-55ed-4511-bec5-8f930f2328d5',
        }),
      );
    });

    it('creates donation without attachment id', async () => {
      const input = {
        categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
        title: 'No image donation',
        description: 'Donation without media',
        quantity: 3,
        specification: { note: 'text only' },
        expiryDate: new Date('2030-01-01T10:00:00.000Z'),
        urgency: DonationUrgencyValues.LOW,
        safetyChecklistCompleted: true,
      };

      const createdEntity = {
        id: 'd-no-attachment',
        ...input,
        userId: 'u1',
        status: DonationStatusValues.DRAFT,
      };

      donationRepository.create.mockReturnValue(createdEntity);
      donationRepository.save.mockResolvedValue(createdEntity);
      donationPhotoRepository.find.mockResolvedValue([]);

      const result = await service.createDonation(input, 'u1');

      expect(donationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          quantity: input.quantity,
          specification: input.specification,
          expiryDate: input.expiryDate,
          userId: 'u1',
          status: DonationStatusValues.DRAFT,
          urgency: DonationUrgencyValues.LOW,
          safetyChecklistCompleted: true,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          ...createdEntity,
          attachmentIds: [],
          mainAttachmentId: undefined,
        }),
      );
    });

    it('throws BadRequestException when attachment ids are duplicated', async () => {
      await expect(
        service.createDonation(
          {
            categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
            title: 'Dup photos',
            description: 'Duplicate ids',
            quantity: 2,
            specification: {},
            expiryDate: new Date('2030-01-01T10:00:00.000Z'),
            urgency: DonationUrgencyValues.LOW,
            safetyChecklistCompleted: false,
            attachmentIds: [
              'a1111111-1111-1111-1111-111111111111',
              'a1111111-1111-1111-1111-111111111111',
            ],
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when expiry date is invalid', async () => {
      await expect(
        service.createDonation(
          {
            categoryId: '8f7f7173-b34c-4560-9766-13f113a5d7f1',
            title: 'Bread packs',
            description: 'Fresh bread packs',
            quantity: 12,
            specification: {},
            urgency: DonationUrgencyValues.MEDIUM,
            safetyChecklistCompleted: false,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiryDate: new Date('invalid-date') as any,
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
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

      const result = await service.deleteDonation('d1', 'u1');

      expect(donationRepository.delete).toHaveBeenCalledWith({
        id: 'd1',
        userId: 'u1',
      });
      expect(result).toEqual({ message: 'Donation deleted successfully' });
    });

    it('throws NotFoundException when donation is not owned or missing', async () => {
      donationRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteDonation('d404', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
