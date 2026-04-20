import { Test, TestingModule } from '@nestjs/testing';
import { ReservationResolver } from 'src/core/reservation/reservation.resolver';
import { ReservationService } from 'src/core/reservation/reservation.service';
import { ReservationStatusValues } from 'src/core/reservation/entities/reservation.entity';

describe('ReservationResolver', () => {
  let resolver: ReservationResolver;
  let service: ReservationService;

  const mockReservationService = {
    findMyReservations: jest.fn(),
    findDonationReservations: jest.fn(),
    findMyReservationById: jest.fn(),
    reserveDonation: jest.fn(),
    confirmReservation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationResolver,
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
      ],
    }).compile();

    resolver = module.get<ReservationResolver>(ReservationResolver);
    service = module.get<ReservationService>(ReservationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('myReservations', () => {
    it('passes userId, filter and pagination to service', async () => {
      const paginated = {
        items: [],
        totalCount: 0,
        page: 1,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockReservationService.findMyReservations.mockResolvedValue(paginated);

      const filter = { status: ReservationStatusValues.PENDING };
      const pagination = { page: 1, limit: 10 };

      const result = await resolver.myReservations('u1', pagination, filter);

      expect(service.findMyReservations).toHaveBeenCalledWith(
        'u1',
        filter,
        pagination,
      );
      expect(result).toEqual(paginated);
    });
  });

  describe('reserveDonation', () => {
    it('passes quantity=1 when omitted', async () => {
      mockReservationService.reserveDonation.mockResolvedValue({ id: 'r1' });

      await resolver.reserveDonation(
        { donationId: 'd1', quantity: undefined },
        'u1',
      );

      expect(service.reserveDonation).toHaveBeenCalledWith('d1', 'u1', 1);
    });

    it('passes provided quantity to service', async () => {
      mockReservationService.reserveDonation.mockResolvedValue({ id: 'r2' });

      await resolver.reserveDonation({ donationId: 'd1', quantity: 3 }, 'u1');

      expect(service.reserveDonation).toHaveBeenCalledWith('d1', 'u1', 3);
    });
  });

  describe('donationReservations', () => {
    it('passes donationId, userId and pagination to service', async () => {
      const paginated = {
        items: [],
        totalCount: 0,
        page: 1,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockReservationService.findDonationReservations.mockResolvedValue(
        paginated,
      );

      const pagination = { page: 1, limit: 10 };
      const result = await resolver.donationReservations(
        'd1',
        'u1',
        pagination,
      );

      expect(service.findDonationReservations).toHaveBeenCalledWith(
        'd1',
        'u1',
        pagination,
      );
      expect(result).toEqual(paginated);
    });
  });
});
