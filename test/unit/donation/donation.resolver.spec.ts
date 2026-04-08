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
    createDonation: jest.fn(),
    updateDonation: jest.fn(),
    deleteDonation: jest.fn(),
  };

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
        "User",
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
