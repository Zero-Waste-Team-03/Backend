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

describe('ReservationService', () => {
  let service: ReservationService;

  const reservationRepository = {
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const donationRepository = {
    findOne: jest.fn(),
  };

  const reservationQueue = {
    add: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMyReservations', () => {
    it('adds status filter for both beneficiary and donor branches', async () => {
      reservationRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findMyReservations(
        'u1',
        { status: ReservationStatusValues.PENDING },
        { page: 1, limit: 10 },
      );

      expect(reservationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            {
              beneficiaryId: 'u1',
              status: ReservationStatusValues.PENDING,
            },
            {
              donation: { userId: 'u1' },
              status: ReservationStatusValues.PENDING,
            },
          ],
          skip: 0,
          take: 10,
        }),
      );
    });

    it('does not add status filter when missing', async () => {
      reservationRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findMyReservations('u1', undefined, {
        page: 1,
        limit: 10,
      });

      expect(reservationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            {
              beneficiaryId: 'u1',
            },
            {
              donation: { userId: 'u1' },
            },
          ],
        }),
      );
    });

    it('maps reservation entities to reservation type shape', async () => {
      reservationRepository.findAndCount.mockResolvedValue([
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
});
