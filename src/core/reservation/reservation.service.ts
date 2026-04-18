import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { RESERVATION_JOBS } from 'src/common/constants/jobs';
import {
  Reservation,
  ReservationStatus,
  ReservationStatusValues,
} from './entities/reservation.entity';
import {
  Donation,
  DonationStatusValues,
} from '../donation/entities/donation.entity';
import { throwAppError } from 'src/common/errors/throw-app-error';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';
import { PaginatedReservations } from './graphql/types/paginated-reservations.type';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPE } from '../notifications/enums/notification-type.enum';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly EXPIRATION_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectQueue(QUEUE_NAME.RESERVATION)
    private readonly reservationQueue: Queue,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findMyReservations(
    userId: string,
    filter: { status?: ReservationStatus } = {},
    pagination?: PaginationInput,
  ): Promise<PaginatedReservations> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .where('reservation.beneficiaryId = :userId', { userId })
      .orWhere('donation.userId = :userId', { userId })
      .orderBy('reservation.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    if (filter.status) {
      queryBuilder.andWhere('(reservation.status = :status)', {
        status: filter.status,
      });
    }

    const [items, totalCount] = await queryBuilder.getManyAndCount();

    return {
      items: items as any,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async findMyReservationById(
    reservationId: string,
    userId: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .where('reservation.id = :reservationId', { reservationId })
      .andWhere(
        '(reservation.beneficiaryId = :userId OR donation.userId = :userId)',
        { userId },
      )
      .getOne();

    if (!reservation) {
      throwAppError('RESERVATION_NOT_FOUND', {
        id: reservationId,
        status: ReservationStatusValues.PENDING,
      });
    }

    return reservation;
  }

  public async expireReservation(reservationId: string) {
    let donorId: string | null = null;
    let beneficiaryId: string | null = null;
    let donationId: string | null = null;

    await this.reservationRepository.manager.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id: reservationId },
        lock: { mode: 'pessimistic_write' },
        select: ['id', 'status', 'donationId', 'beneficiaryId'],
      });

      if (!reservation) {
        this.logger.warn(
          `Expiration job failed: Reservation ${reservationId} not found.`,
        );
        return;
      }
      if (reservation.status !== ReservationStatusValues.PENDING) {
        this.logger.log(
          `Expiration job skipped: Reservation ${reservationId} is already ${reservation.status}.`,
        );
        return;
      }

      const donation = await manager.findOne(Donation, {
        where: { id: reservation.donationId },
        select: ['id', 'userId'],
      });

      if (!donation) {
        this.logger.warn(
          `Expiration job failed: Donation ${reservation.donationId} not found for reservation ${reservationId}.`,
        );
        return;
      }

      await manager.update(Donation, reservation.donationId, {
        status: DonationStatusValues.PUBLISHED,
      });
      await manager.update(Reservation, reservationId, {
        status: ReservationStatusValues.CANCELLED,
      });

      this.logger.log(
        `Reservation ${reservationId} has expired and was cancelled automatically.`,
      );

      donorId = donation.userId;
      beneficiaryId = reservation.beneficiaryId;
      donationId = reservation.donationId;
    });

    if (!donorId || !beneficiaryId || !donationId) {
      return;
    }

    await Promise.allSettled([
      this.notificationsService.sendNotification(
        'Reservation expired',
        'A pending reservation for your donation expired automatically.',
        donorId,
        NOTIFICATION_TYPE.RESERVATION_ALERT,
        {
          reservationId,
          donationId,
          status: ReservationStatusValues.CANCELLED,
        },
      ),
      this.notificationsService.sendNotification(
        'Reservation expired',
        'Your reservation expired because it was not confirmed in time.',
        beneficiaryId,
        NOTIFICATION_TYPE.RESERVATION_ALERT,
        {
          reservationId,
          donationId,
          status: ReservationStatusValues.CANCELLED,
        },
      ),
    ]);
  }

  async reserveDonation(
    donationId: string,
    beneficiaryId: string,
  ): Promise<Reservation> {
    const result = await this.reservationRepository.manager.transaction(
      async (manager) => {
        const donation = await manager.findOne(Donation, {
          where: { id: donationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!donation) {
          throwAppError('DONATION_NOT_FOUND', { id: donationId });
        }

        if (donation.status !== DonationStatusValues.PUBLISHED) {
          throwAppError('DONATION_NOT_AVAILABLE', {
            id: donationId,
            status: donation.status,
          });
        }

        const reservation = manager.create(Reservation, {
          donationId,
          beneficiaryId,
        });

        const savedReservation = await manager.save(Reservation, reservation);

        donation.status = DonationStatusValues.RESERVED;
        await manager.save(Donation, donation);

        await this.reservationQueue.add(
          RESERVATION_JOBS.EXPIRE_RESERVATION,
          { reservationId: savedReservation.id },
          {
            jobId: `reservation-${savedReservation.id}`,
            delay: this.EXPIRATION_TIME_MS,
            removeOnComplete: true,
            removeOnFail: { age: 24 * 3600, count: 100 },
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        );

        this.logger.log(
          `Scheduled expiration job for reservation ${savedReservation.id}`,
        );

        return {
          reservation: savedReservation,
          donorId: donation.userId,
        };
      },
    );

    await this.notificationsService.sendNotification(
      'Donation reserved',
      'A beneficiary has reserved your donation.',
      result.donorId,
      NOTIFICATION_TYPE.RESERVATION_ALERT,
      {
        reservationId: result.reservation.id,
        donationId,
        beneficiaryId,
        status: ReservationStatusValues.PENDING,
      },
    );

    return result.reservation;
  }

  async confirmReservation(
    reservationId: string,
    beneficiaryId: string,
  ): Promise<Reservation> {
    const result = await this.reservationRepository.manager.transaction(
      async (manager) => {
        const reservation = await manager.findOne(Reservation, {
          where: { id: reservationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!reservation) {
          throwAppError('RESERVATION_NOT_FOUND', {
            id: reservationId,
            status: ReservationStatusValues.PENDING,
          });
        }

        if (reservation.beneficiaryId !== beneficiaryId) {
          throwAppError('RESERVATION_OWNERSHIP_INVALID');
        }

        if (reservation.status !== ReservationStatusValues.PENDING) {
          throwAppError('RESERVATION_STATUS_INVALID', {
            status: reservation.status,
          });
        }

        reservation.status = ReservationStatusValues.CONFIRMED;
        reservation.confirmedAt = new Date();
        const savedReservation = await manager.save(Reservation, reservation);

        const donation = await manager.findOne(Donation, {
          where: { id: reservation.donationId },
          select: ['id', 'userId'],
        });

        if (!donation) {
          throwAppError('DONATION_NOT_FOUND', { id: reservation.donationId });
        }

        await this.reservationQueue.remove(`reservation-${reservationId}`);

        this.logger.log(
          `Reservation ${reservationId} confirmed by beneficiary ${beneficiaryId}`,
        );

        return {
          reservation: savedReservation,
          donorId: donation.userId,
          donationId: donation.id,
        };
      },
    );

    await this.notificationsService.sendNotification(
      'Reservation confirmed',
      'The beneficiary confirmed your donation reservation.',
      result.donorId,
      NOTIFICATION_TYPE.RESERVATION_ALERT,
      {
        reservationId,
        donationId: result.donationId,
        beneficiaryId,
        status: ReservationStatusValues.CONFIRMED,
      },
    );

    return result.reservation;
  }
}
