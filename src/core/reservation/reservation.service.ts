import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Reservation,
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
import { ReservationsFilterInput } from './graphql/inputs/reservations-filter.input';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findMyReservations(
    userId: string,
    filter:ReservationsFilterInput = {},
    pagination?: PaginationInput,
  ): Promise<PaginatedReservations> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .orderBy('reservation.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
  if (filter.status){
      queryBuilder.andWhere('(reservation.status = :status)', {
        status: filter.status,
    });
    }
    if (filter.roleFilter==="BENEFICIARY"){
queryBuilder.andWhere('reservation.beneficiaryId = :userId', { userId })
    }
      else if (filter.roleFilter==="DONOR"){
      queryBuilder.andWhere('donation.userId = :userId', { userId })
      }
      else{
queryBuilder.andWhere('reservation.beneficiaryId = :userId', { userId }).orWhere('donation.userId = :userId', { userId })
      }
   
      this.logger.log(`Finding reservation for ${userId}`,{
        filter,
        query: queryBuilder.getSql(),
      })

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

  async findDonationReservations(
    donationId: string,
    ownerId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedReservations> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .where('reservation.donationId = :donationId', { donationId })
      .andWhere('donation.userId = :ownerId', { ownerId })
      .orderBy('reservation.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

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

  public async expireReservation(reservationId: string) {
    // TODO: Reintroduce reservation expiration after product requirements are finalized.
    this.logger.log(
      `Reservation expiration is disabled. Skipping job for reservation ${reservationId}.`,
    );
  }

  async reserveDonation(
    donationId: string,
    beneficiaryId: string,
    quantity = 1,
  ): Promise<Reservation> {
      
    if (!Number.isInteger(quantity) || quantity < 1) {
      throwAppError('RESERVATION_QUANTITY_INVALID', { quantity });
    }

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

        const existingReservation = await manager
          .createQueryBuilder(Reservation, 'reservation')
          .setLock('pessimistic_write')
          .where('reservation.donationId = :donationId', { donationId })
          .andWhere('reservation.beneficiaryId = :beneficiaryId', {
            beneficiaryId,
          })
          .andWhere('reservation.status IN (:...activeStatuses)', {
            activeStatuses: [
              ReservationStatusValues.PENDING,
              ReservationStatusValues.CONFIRMED,
            ],
          })
          .getOne();

        if (existingReservation) {
          throwAppError('RESERVATION_ALREADY_ACTIVE', {
            donationId,
            beneficiaryId,
          });
        }

        const activeReservationQuantity = await manager
          .createQueryBuilder(Reservation, 'reservation')
          .where('reservation.donationId = :donationId', { donationId })
          .andWhere('reservation.status IN (:...statuses)', {
            statuses: [
              ReservationStatusValues.PENDING,
              ReservationStatusValues.CONFIRMED,
            ],
          })
          .select('COALESCE(SUM(reservation.quantity), 0)', 'total')
          .getRawOne<{ total: string | number }>();

        const reservedQuantity = Number(activeReservationQuantity?.total ?? 0);
        const remainingQuantity = donation.quantity - reservedQuantity;

        if (quantity > remainingQuantity) {
          throwAppError('DONATION_CAPACITY_EXCEEDED', {
            id: donationId,
            requestedQuantity: quantity,
            remainingQuantity,
          });
        }

        console.log("Creating reservation with quantity", {quantity, remainingQuantity})
        const reservation = manager.getRepository(Reservation).create({
          donationId,
          beneficiaryId,
          quantity,
          status: ReservationStatusValues.CONFIRMED,
          confirmedAt: new Date(),
        });

        const savedReservation = await manager.getRepository(Reservation).save(reservation);


        // TODO: Re-enable delayed expiration scheduling if product requirements require it.

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
        quantity,
        status: ReservationStatusValues.CONFIRMED,
      },
    );

    return result.reservation;
  }

  async confirmReservation(
    reservationId: string,
    beneficiaryId: string,
  ): Promise<Reservation> {
    return this.reservationRepository.manager.transaction(async (manager) => {
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

      if (reservation.status === ReservationStatusValues.CONFIRMED) {
        this.logger.warn(
          `confirmReservation is deprecated and was called for already-confirmed reservation ${reservationId}.`,
        );
        return reservation;
      }

      if (reservation.status !== ReservationStatusValues.PENDING) {
        throwAppError('RESERVATION_STATUS_INVALID', {
          status: reservation.status,
        });
      }

      reservation.status = ReservationStatusValues.CONFIRMED;
      reservation.confirmedAt = reservation.confirmedAt ?? new Date();
      const savedReservation = await manager.save(Reservation, reservation);

      this.logger.log(
        `confirmReservation is deprecated. Confirmed legacy pending reservation ${reservationId}.`,
      );

      return savedReservation;
    });
  }
}
