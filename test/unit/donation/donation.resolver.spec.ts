import { Test, TestingModule } from '@nestjs/testing';
import { DonationResolver } from 'src/core/donation/donation.resolver';
import { DonationService } from 'src/core/donation/v1/donation.service';
import { DonationUrgencyValues } from 'src/core/donation/entities/donation.entity';

describe('DonationResolver', () => {
  let resolver: DonationResolver;
  let service: DonationService;

  const mockDonationService = {
    getStatistics: jest.fn(),
    findAll: jest.fn(),
    findLikedDonations: jest.fn(),
    getDonationById: jest.fn(),
    likeDonation: jest.fn(),
    unlikeDonation: jest.fn(),
    getDonationsForMap: jest.fn(),
    createDonation: jest.fn(),
    updateDonation: jest.fn(),
    deleteDonation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationResolver,
        {
          provide: DonationService,
          useValue: mockDonationService,
        },
      ],
    }).compile();

    resolver = module.get<DonationResolver>(DonationResolver);
    service = module.get<DonationService>(DonationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('donationStatistics', () => {
    it('should return donation statistics', async () => {
      const stats = {
        totalActiveDonations: 10,
        flaggedItems: 2,
        pendingApprovals: 5,
      };
      mockDonationService.getStatistics.mockResolvedValue(stats);

      const result = await resolver.donationStatistics();

      expect(service.getStatistics).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('donations', () => {
    it('should return paginated donations with filters', async () => {
      const mockPaginatedResult = {
        items: [{ id: 'd1', title: 'Test Donation' }],
        totalCount: 1,
        page: 1,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockDonationService.findAll.mockResolvedValue(mockPaginatedResult);

      const filter = {
        categoryId: 'cat-1',
        urgency: DonationUrgencyValues.HIGH,
      };
      const behaviorContext = { distanceBucket: '1km', origin: 'list' };
      const pagination = { page: 1, limit: 10 };

      const result = await resolver.donations(
        'u1',
        'User',
        filter,
        behaviorContext as any,
        pagination,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        'u1',
        filter,
        behaviorContext,
        pagination,
        false,
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('likedDonations', () => {
    it('should return paginated liked donations', async () => {
      const mockPaginatedResult = {
        items: [{ id: 'd1', title: 'Liked Donation', isLikedByMe: true }],
        totalCount: 1,
        page: 1,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockDonationService.findLikedDonations.mockResolvedValue(
        mockPaginatedResult,
      );

      const filter = { categoryId: 'cat-1' };
      const pagination = { page: 1, limit: 10 };

      const result = await resolver.likedDonations('u1', filter, pagination);

      expect(service.findLikedDonations).toHaveBeenCalledWith(
        'u1',
        filter,
        pagination,
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('donation', () => {
    it('should return donation by id with viewer context', async () => {
      const payload = { id: 'd1', title: 'Donation', isLikedByMe: true };
      mockDonationService.getDonationById.mockResolvedValue(payload);

      const result = await resolver.donation('d1', 'u1');

      expect(service.getDonationById).toHaveBeenCalledWith('d1', 'u1');
      expect(result).toEqual(payload);
    });
  });

  describe('likeDonation', () => {
    it('should call service likeDonation', async () => {
      mockDonationService.likeDonation.mockResolvedValue({
        message: 'Donation liked successfully',
      });

      const result = await resolver.likeDonation('d1', 'u1');

      expect(service.likeDonation).toHaveBeenCalledWith('d1', 'u1');
      expect(result).toEqual({ message: 'Donation liked successfully' });
    });
  });

  describe('unlikeDonation', () => {
    it('should call service unlikeDonation', async () => {
      mockDonationService.unlikeDonation.mockResolvedValue({
        message: 'Donation unliked successfully',
      });

      const result = await resolver.unlikeDonation('d1', 'u1');

      expect(service.unlikeDonation).toHaveBeenCalledWith('d1', 'u1');
      expect(result).toEqual({ message: 'Donation unliked successfully' });
    });
  });

  describe('donationsMap', () => {
    it('should include user context for liked marker state', async () => {
      const payload = [
        {
          id: 'd1',
          title: 'Map donation',
          latitude: 1,
          longitude: 2,
          markerColor: 'Green',
          urgency: DonationUrgencyValues.LOW,
          categoryId: 'cat-1',
          mainAttachmentId: 'a1',
        },
      ];
      mockDonationService.getDonationsForMap.mockResolvedValue(payload);

      const input = { radius: 10, latitude: 36.7, longitude: 3.0 };
      const result = await resolver.donationsMap('u1', input as any);

      expect(service.getDonationsForMap).toHaveBeenCalledWith(input, 'u1');
      expect(result).toEqual(payload);
    });
  });

  describe('user (ResolveField)', () => {
    it('should load donor user using dataloader', async () => {
      const mockUser = { id: 'u1', email: 'donor@example.com' };
      const mockLoaders = {
        userLoader: {
          load: jest.fn().mockResolvedValue(mockUser),
        },
      };

      const donation = { id: 'd1', userId: 'u1' } as any;
      const result = await resolver.user(donation, {
        loaders: mockLoaders as any,
      });

      expect(mockLoaders.userLoader.load).toHaveBeenCalledWith('u1');
      expect(result).toEqual(mockUser);
    });
  });
});
