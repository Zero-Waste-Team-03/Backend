import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ReservationService } from 'src/core/reservation/reservation.service';
import {
  Reservation,
  ReservationStatusValues,
} from 'src/core/reservation/entities/reservation.entity';
import { Donation } from 'src/core/donation/entities/donation.entity';
import { QUEUE_NAME } from 'src/common/constants/queues';
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
  let reservationQueue: {
    add: jest.Mock;
    remove: jest.Mock;
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

    reservationQueue = {
      add: jest.fn(),
      remove: jest.fn(),
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
          provide: getQueueToken(QUEUE_NAME.RESERVATION),
          useValue: reservationQueue,
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
    it('notifies donor when reservation is created', async () => {
      const donation = {
        id: 'd1',
        userId: 'donor-1',
        status: DonationStatusValues.PUBLISHED,
      } as Donation;
      const savedReservation = {
        id: 'r1',
        donationId: 'd1',
        beneficiaryId: 'beneficiary-1',
      } as Reservation;

      const manager = {
        findOne: jest.fn().mockResolvedValue(donation),
        create: jest.fn().mockReturnValue(savedReservation),
        save: jest
          .fn()
          .mockResolvedValueOnce(savedReservation)
          .mockResolvedValueOnce({
            ...donation,
            status: DonationStatusValues.RESERVED,
          }),
      };

      reservationRepository.manager.transaction.mockImplementation(async (cb) =>
        cb(manager),
      );

      await service.reserveDonation('d1', 'beneficiary-1');

      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        'Donation reserved',
        'A beneficiary has reserved your donation.',
        'donor-1',
        expect.any(String),
        expect.objectContaining({
          reservationId: 'r1',
          donationId: 'd1',
          beneficiaryId: 'beneficiary-1',
        }),
      );
    });
  });

  describe('confirmReservation', () => {
    it('notifies donor when reservation is confirmed', async () => {
      const reservation = {
        id: 'r1',
        donationId: 'd1',
        beneficiaryId: 'beneficiary-1',
        status: ReservationStatusValues.PENDING,
      } as Reservation;
      const donation = {
        id: 'd1',
        userId: 'donor-1',
      } as Donation;

      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(reservation)
          .mockResolvedValueOnce(donation),
        save: jest.fn().mockResolvedValue({
          ...reservation,
          status: ReservationStatusValues.CONFIRMED,
        }),
      };

      reservationRepository.manager.transaction.mockImplementation(async (cb) =>
        cb(manager),
      );

      await service.confirmReservation('r1', 'beneficiary-1');

      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        'Reservation confirmed',
        'The beneficiary confirmed your donation reservation.',
        'donor-1',
        expect.any(String),
        expect.objectContaining({
          reservationId: 'r1',
          donationId: 'd1',
          beneficiaryId: 'beneficiary-1',
        }),
      );
    });
  });

  describe('expireReservation', () => {
    it('notifies donor and beneficiary when reservation expires', async () => {
      const reservation = {
        id: 'r1',
        donationId: 'd1',
        beneficiaryId: 'beneficiary-1',
        status: ReservationStatusValues.PENDING,
      } as Reservation;
      const donation = {
        id: 'd1',
        userId: 'donor-1',
      } as Donation;

      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(reservation)
          .mockResolvedValueOnce(donation),
        update: jest.fn().mockResolvedValue(undefined),
      };

      reservationRepository.manager.transaction.mockImplementation(async (cb) =>
        cb(manager),
      );

      await service.expireReservation('r1');

      expect(notificationsService.sendNotification).toHaveBeenCalledTimes(2);
      expect(notificationsService.sendNotification).toHaveBeenNthCalledWith(
        1,
        'Reservation expired',
        'A pending reservation for your donation expired automatically.',
        'donor-1',
        expect.any(String),
        expect.objectContaining({ reservationId: 'r1', donationId: 'd1' }),
      );
      expect(notificationsService.sendNotification).toHaveBeenNthCalledWith(
        2,
        'Reservation expired',
        'Your reservation expired because it was not confirmed in time.',
        'beneficiary-1',
        expect.any(String),
        expect.objectContaining({ reservationId: 'r1', donationId: 'd1' }),
      );
    });
  });
});
