import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationService } from 'src/core/reservation/reservation.service';
import {
  Reservation,
  ReservationStatusValues,
} from 'src/core/reservation/entities/reservation.entity';
import { Donation } from 'src/core/donation/entities/donation.entity';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { DonationStatusValues } from 'src/core/donation/entities/donation.entity';

describe('ReservationService', () => {
  let service: ReservationService;
  let reservationRepository: {
    createQueryBuilder: jest.Mock;
    manager: {
      transaction: jest.Mock;
    };
  };
  let donationRepository: {
    findOne: jest.Mock;
  };
  let notificationsService: {
    sendNotification: jest.Mock;
  };

  type MockQueryBuilder = {
    innerJoin: jest.Mock;
    where: jest.Mock;
    orWhere: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  let queryBuilder: MockQueryBuilder;

  beforeEach(async () => {
    jest.clearAllMocks();

    queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    reservationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      manager: {
        transaction: jest.fn(),
      },
    };

    donationRepository = {
      findOne: jest.fn(),
    };

    notificationsService = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationRepository,
        },
        {
          provide: getRepositoryToken(Donation),
          useValue: donationRepository,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMyReservations', () => {
    it('adds status filter for both beneficiary and donor branches', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findMyReservations(
        'u1',
        { status: ReservationStatusValues.PENDING },
        { page: 1, limit: 10 },
      );

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'reservation.beneficiaryId = :userId',
        { userId: 'u1' },
      );
      expect(queryBuilder.orWhere).toHaveBeenCalledWith(
        'donation.userId = :userId',
        { userId: 'u1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(reservation.status = :status)',
        { status: ReservationStatusValues.PENDING },
      );
    });

    it('does not add status filter when missing', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findMyReservations('u1', undefined, {
        page: 1,
        limit: 10,
      });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'reservation.beneficiaryId = :userId',
        { userId: 'u1' },
      );
      expect(queryBuilder.orWhere).toHaveBeenCalledWith(
        'donation.userId = :userId',
        { userId: 'u1' },
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('maps reservation entities to reservation type shape', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'r1',
            donationId: 'd1',
            beneficiaryId: 'u1',
            status: ReservationStatusValues.PENDING,
            confirmedAt: null,
            createdAt: new Date('2030-01-01T00:00:00.000Z'),
            updatedAt: new Date('2030-01-02T00:00:00.000Z'),
          },
        ],
        1,
      ]);

      const result = await service.findMyReservations('u1', undefined, {
        page: 1,
        limit: 10,
      });

      expect(result.totalCount).toBe(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'r1',
          donationId: 'd1',
          beneficiaryId: 'u1',
          status: ReservationStatusValues.PENDING,
        }),
      );
    });
  });

  describe('reserveDonation', () => {
    it('creates auto-confirmed reservation with quantity and notifies donor', async () => {
      const donation = {
        id: 'd1',
        userId: 'donor-1',
        quantity: 5,
        status: DonationStatusValues.PUBLISHED,
      } as Donation;
      const savedReservation = {
        id: 'r1',
        donationId: 'd1',
        beneficiaryId: 'beneficiary-1',
        quantity: 2,
        status: ReservationStatusValues.CONFIRMED,
      } as Reservation;

      const sumQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };

      const existingReservationQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      const manager = {
        findOne: jest.fn().mockResolvedValueOnce(donation),
        create: jest.fn().mockReturnValue(savedReservation),
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(existingReservationQueryBuilder)
          .mockReturnValueOnce(sumQueryBuilder),
        save: jest.fn().mockResolvedValue(savedReservation),
      };

      reservationRepository.manager.transaction.mockImplementation(async (cb) =>
        cb(manager),
      );

      await service.reserveDonation('d1', 'beneficiary-1', 2);

      expect(existingReservationQueryBuilder.getOne).toHaveBeenCalled();
      expect(manager.create).toHaveBeenCalledWith(
        Reservation,
        expect.objectContaining({
          donationId: 'd1',
          beneficiaryId: 'beneficiary-1',
          quantity: 2,
          status: ReservationStatusValues.CONFIRMED,
        }),
      );

      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        'Donation reserved',
        'A beneficiary has reserved your donation.',
        'donor-1',
        expect.any(String),
        expect.objectContaining({
          reservationId: 'r1',
          donationId: 'd1',
          beneficiaryId: 'beneficiary-1',
          quantity: 2,
          status: ReservationStatusValues.CONFIRMED,
        }),
      );
    });
  });

  describe('confirmReservation', () => {
    it('returns confirmed reservation without sending notification', async () => {
      const reservation = {
        id: 'r1',
        donationId: 'd1',
        beneficiaryId: 'beneficiary-1',
        status: ReservationStatusValues.CONFIRMED,
      } as Reservation;

      const manager = {
        findOne: jest.fn().mockResolvedValueOnce(reservation),
      };

      reservationRepository.manager.transaction.mockImplementation(async (cb) =>
        cb(manager),
      );

      const result = await service.confirmReservation('r1', 'beneficiary-1');

      expect(result).toEqual(reservation);
      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('expireReservation', () => {
    it('is disabled and does not notify anyone', async () => {
      await service.expireReservation('r1');

      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });
  });
});
