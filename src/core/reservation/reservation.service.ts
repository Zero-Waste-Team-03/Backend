import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
import { User } from '../user/entities/user.entity';
import { Attachment } from 'src/common/modules/attachment/entities/attachment.entity';
import { DonationPhoto } from '../donation/entities/donation-photo.entity';
import { ReservationsFilterInput } from './graphql/inputs/reservations-filter.input';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { RESERVATION_JOBS } from 'src/common/constants/jobs';
import { NOTIFICATION_ACTION } from '../notifications/constants/notification-actions';
import { Conversation, ConversationStatusValues } from '../chat/entities/conversation.entity';

const RESERVATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly notificationsService: NotificationsService,
    @InjectQueue(QUEUE_NAME.RESERVATION)
    private readonly reservationQueue: Queue,
  ) {}

  public async expireReservation(reservationId: string) {
    this.logger.log(`Expiring reservation ${reservationId}`);

    const result = await this.reservationRepository.manager.transaction(
      async (manager) => {
        const reservation = await manager.findOne(Reservation, {
          where: { id: reservationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!reservation) {
          this.logger.warn(
            `Reservation ${reservationId} not found. Skipping expiry.`,
          );
          return null;
        }

        if (reservation.status !== ReservationStatusValues.CONFIRMED) {
          this.logger.log(
            `Reservation ${reservationId} is ${reservation.status}, not Confirmed. Skipping expiry.`,
          );
          return null;
        }

        const donation = await manager.findOne(Donation, {
          where: { id: reservation.donationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!donation) {
          this.logger.warn(
            `Donation ${reservation.donationId} not found for reservation ${reservationId}. Skipping expiry.`,
          );
          return null;
        }

        reservation.status = ReservationStatusValues.EXPIRED;
        const savedReservation = await manager.save(Reservation, reservation);

        donation.quantity += reservation.quantity;
        if (donation.quantity > 0 && donation.status !== DonationStatusValues.PUBLISHED) {
          donation.status = DonationStatusValues.PUBLISHED;
        }
        if (donation.quantity <= 0) {
          donation.status = DonationStatusValues.COMPLETED;
        }
        await manager.save(Donation, donation);

        const conversation = await manager.findOne(Conversation, {
          where: { reservationId: reservation.id },
        });

        if (conversation) {
          conversation.status = ConversationStatusValues.ARCHIVED;
          await manager.save(Conversation, conversation);
        }

        return {
          reservation: savedReservation,
          donorId: donation.userId,
          donationTitle: donation.title,
          donationId: donation.id,
        };
      },
    );

    if (!result) {
      return;
    }

    const { donorId, donationTitle, donationId } = result;

    await this.notificationsService.sendNotification(
      'Reservation expired',
      `The reservation for "${donationTitle}" has expired and the quantity has been restored.`,
      donorId,
      NOTIFICATION_TYPE.RESERVATION_EXPIRED,
      {
        action: NOTIFICATION_ACTION.RESERVATION_OPEN,
        reservationId,
        donationId,
        donationTitle,
        status: ReservationStatusValues.EXPIRED,
      },
    );

    const beneficiary = await this.reservationRepository.manager.findOne(User, {
      where: { id: result.reservation.beneficiaryId },
      select: { id: true, displayName: true },
    });

    if (beneficiary) {
      await this.notificationsService.sendNotification(
        'Reservation expired',
        `Your reservation for "${donationTitle}" has expired and the quantity has been restored to the donor.`,
        beneficiary.id,
        NOTIFICATION_TYPE.RESERVATION_EXPIRED,
        {
          action: NOTIFICATION_ACTION.RESERVATION_OPEN,
          reservationId,
          donationId,
          donationTitle,
          status: ReservationStatusValues.EXPIRED,
        },
      );
    }
  }

  public async cancelExpiryJob(reservationId: string): Promise<void> {
    const jobId = `expire-reservation-${reservationId}`;
    const job = await this.reservationQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(
        `Cancelled expiry job for reservation ${reservationId}`,
      );
    }
  }

  async cancelReservation(
    reservationId: string,
    userId: string,
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

        if (reservation.status !== ReservationStatusValues.CONFIRMED) {
          if (reservation.status === ReservationStatusValues.EXPIRED) {
            throwAppError('RESERVATION_EXPIRED', { id: reservationId });
          }
          if (reservation.status === ReservationStatusValues.CANCELLED) {
            throwAppError('RESERVATION_ALREADY_CANCELLED', {
              id: reservationId,
            });
          }
          throwAppError('RESERVATION_STATUS_INVALID', {
            status: reservation.status,
          });
        }

        const donation = await manager.findOne(Donation, {
          where: { id: reservation.donationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!donation) {
          throwAppError('DONATION_NOT_FOUND', {
            id: reservation.donationId,
          });
        }

        const isDonor = donation.userId === userId;
        const isBeneficiary = reservation.beneficiaryId === userId;

        if (!isDonor && !isBeneficiary) {
          throwAppError('RESERVATION_OWNERSHIP_INVALID');
        }

        reservation.status = ReservationStatusValues.CANCELLED;
        const savedReservation = await manager.save(Reservation, reservation);

        donation.quantity += reservation.quantity;
        if (donation.quantity > 0 && donation.status !== DonationStatusValues.PUBLISHED) {
          donation.status = DonationStatusValues.PUBLISHED;
        }
        if (donation.quantity <= 0) {
          donation.status = DonationStatusValues.COMPLETED;
        }
        await manager.save(Donation, donation);

        const conversation = await manager.findOne(Conversation, {
          where: { reservationId: reservation.id },
        });

        if (conversation) {
          conversation.status = ConversationStatusValues.ARCHIVED;
          await manager.save(Conversation, conversation);
        }

        return {
          reservation: savedReservation,
          donorId: donation.userId,
          beneficiaryId: reservation.beneficiaryId,
          donationTitle: donation.title,
          donationId: donation.id,
        };
      },
    );

    await this.cancelExpiryJob(reservationId);

    const { donorId, beneficiaryId, donationTitle, donationId } = result;

    await this.notificationsService.sendNotification(
      'Reservation cancelled',
      `The reservation for "${donationTitle}" has been cancelled and the quantity has been restored.`,
      donorId,
      NOTIFICATION_TYPE.RESERVATION_CANCELLED,
      {
        action: NOTIFICATION_ACTION.RESERVATION_OPEN,
        reservationId,
        donationId,
        donationTitle,
        status: ReservationStatusValues.CANCELLED,
      },
    );

    await this.notificationsService.sendNotification(
      'Reservation cancelled',
      `Your reservation for "${donationTitle}" has been cancelled and the quantity has been restored to the donor.`,
      beneficiaryId,
      NOTIFICATION_TYPE.RESERVATION_CANCELLED,
      {
        action: NOTIFICATION_ACTION.RESERVATION_OPEN,
        reservationId,
        donationId,
        donationTitle,
        status: ReservationStatusValues.CANCELLED,
      },
    );

    return result.reservation;
  }

  async findMyReservations(
    userId: string,
    filter: ReservationsFilterInput = {},
    pagination?: PaginationInput,
    searchName?: string,
  ): Promise<PaginatedReservations> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin(Donation, 'donation', 'donation.id = reservation.donationId')
      .orderBy('reservation.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filter.status) {
      queryBuilder.andWhere('(reservation.status = :status)', {
        status: filter.status,
      });
    }

    if (filter.roleFilter === 'BENEFICIARY') {
      queryBuilder.andWhere('reservation.beneficiaryId = :userId', { userId });
    } else if (filter.roleFilter === 'DONOR') {
      queryBuilder.andWhere('donation.userId = :userId', { userId });
    } else {
      queryBuilder.andWhere(
        '(reservation.beneficiaryId = :userId OR donation.userId = :userId)',
        { userId },
      );
    }

    const trimmedSearchName = searchName?.trim();
    if (trimmedSearchName) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('donation.title ILIKE :searchName', {
            searchName: `%${trimmedSearchName}%`,
          }).orWhere('donation.description ILIKE :searchName', {
            searchName: `%${trimmedSearchName}%`,
          });
        }),
      );
    }

    this.logger.log(`Finding reservation for ${userId}`, {
      filter,
      query: queryBuilder.getSql(),
    });

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

        if (beneficiaryId==donation.userId){
          throwAppError('RESERVATION_OWNERSHIP_INVALID');
        }
        if (donation.status !== DonationStatusValues.PUBLISHED) {
          throwAppError('DONATION_NOT_AVAILABLE', {
            id: donationId,
            status: donation.status,
          });
        }

        if (quantity > donation.quantity) {
          throwAppError('DONATION_CAPACITY_EXCEEDED', {
            id: donationId,
            requestedQuantity: quantity,
            remainingQuantity: donation.quantity,
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

        const reservation = manager.getRepository(Reservation).create({
          donationId,
          beneficiaryId,
          quantity,
          status: ReservationStatusValues.CONFIRMED,
          confirmedAt: new Date(),
        });

        const savedReservation = await manager
          .getRepository(Reservation)
          .save(reservation);

        donation.quantity -= quantity;
        if (donation.quantity <= 0) {
          donation.status = DonationStatusValues.COMPLETED;
        }
        await manager.save(Donation, donation);

        return {
          reservation: savedReservation,
          donorId: donation.userId,
          donationTitle: donation.title,
          donationId: donation.id,
        };
      },
    );

    await this.reservationQueue.add(
      RESERVATION_JOBS.EXPIRE_RESERVATION,
      { reservationId: result.reservation.id },
      {
        delay: RESERVATION_EXPIRY_MS,
        jobId: `expire-reservation-${result.reservation.id}`,
        removeOnComplete: true,
      },
    );

    const beneficiary = await this.reservationRepository.manager.findOne(User, {
      where: { id: beneficiaryId },
      select: { id: true, displayName: true, avatarAttachmentId: true },
    });

    const beneficiaryAvatar = beneficiary?.avatarAttachmentId
      ? await this.reservationRepository.manager.findOne(Attachment, {
          where: { id: beneficiary.avatarAttachmentId },
        })
      : null;

    const donationCover = await this.reservationRepository.manager
      .createQueryBuilder(DonationPhoto, 'photo')
      .innerJoin(Attachment, 'attachment', 'attachment.id = photo.attachmentId')
      .where('photo.donationId = :donationId', { donationId })
      .andWhere('photo.isMain = true')
      .select('attachment.url', 'url')
      .getRawOne<{ url: string }>();

    await this.notificationsService.sendNotification(
      'Donation reserved',
      `${beneficiary?.displayName ?? 'A beneficiary'} reserved ${result.reservation.quantity} of ${result.donationTitle}.`,
      result.donorId,
      NOTIFICATION_TYPE.RESERVATION_ALERT,
      {
        action: NOTIFICATION_ACTION.RESERVATION_OPEN,
        reservationId: result.reservation.id,
        donationId,
        beneficiaryName: beneficiary?.displayName ?? null,
        donationTitle: result.donationTitle,
        donationImageUrl: donationCover?.url ?? null,
        senderAvatarUrl: beneficiaryAvatar?.url ?? null,
        quantity,
        status: ReservationStatusValues.CONFIRMED,
      },
    );

    return result.reservation;
  }

  async canUserReserveDonation(
    donationId: string,
    beneficiaryId: string,
  ): Promise<boolean> {
    const donation = await this.reservationRepository.manager.findOne(
      Donation,
      {
        where: { id: donationId },
        select: { id: true, status: true, quantity: true },
      },
    );

    if (!donation) {
      return false;
    }

    if (donation.status !== DonationStatusValues.PUBLISHED) {
      return false;
    }

    if (donation.quantity <= 0) {
      return false;
    }

    const existingReservation = await this.reservationRepository
      .createQueryBuilder('reservation')
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
      return false;
    }

    return true;
  }

  async canDeleteDonations(
    donationIds: readonly string[],
    viewerUserId: string,
    isAdmin: boolean,
  ): Promise<Record<string, boolean>> {
    if (!donationIds.length) {
      return {};
    }

    const donations = await this.reservationRepository.manager.find(Donation, {
      where: { id: In([...donationIds]) },
      select: { id: true, userId: true },
    });

    const donationMap = new Map(
      donations.map((donation) => [donation.id, donation]),
    );

    const donationsWithActiveReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.donationId IN (:...donationIds)', {
        donationIds,
      })
      .andWhere('reservation.status IN (:...activeStatuses)', {
        activeStatuses: [
          ReservationStatusValues.PENDING,
          ReservationStatusValues.CONFIRMED,
        ],
      })
      .select('reservation.donationId', 'donationId')
      .groupBy('reservation.donationId')
      .getRawMany<{ donationId: string }>();

    const blockedDonationIds = new Set(
      donationsWithActiveReservations.map((row) => row.donationId),
    );

    return donationIds.reduce(
      (result, donationId) => {
        const donation = donationMap.get(donationId);

        if (!donation) {
          result[donationId] = false;
          return result;
        }

        const isOwner = donation.userId === viewerUserId;
        if (!isOwner && !isAdmin) {
          result[donationId] = false;
          return result;
        }

        if (blockedDonationIds.has(donationId)) {
          result[donationId] = false;
          return result;
        }

        result[donationId] = true;
        return result;
      },
      {} as Record<string, boolean>,
    );
  }

  async canUserReserveDonations(
    donationIds: readonly string[],
    beneficiaryId: string,
  ): Promise<Record<string, boolean>> {
    if (!donationIds.length) {
      return {};
    }

    const donations = await this.reservationRepository.manager.find(Donation, {
      where: { id: In([...donationIds]) },
      select: { id: true, status: true, quantity: true },
    });

    const donationMap = new Map(
      donations.map((donation) => [donation.id, donation]),
    );

    const activeReservationRows = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.donationId IN (:...donationIds)', {
        donationIds,
      })
      .andWhere('reservation.beneficiaryId = :beneficiaryId', {
        beneficiaryId,
      })
      .andWhere('reservation.status IN (:...activeStatuses)', {
        activeStatuses: [
          ReservationStatusValues.PENDING,
          ReservationStatusValues.CONFIRMED,
        ],
      })
      .select('reservation.donationId', 'donationId')
      .groupBy('reservation.donationId')
      .getRawMany<{ donationId: string }>();

    const donationsWithActiveReservation = new Set(
      activeReservationRows.map((row) => row.donationId),
    );

    return donationIds.reduce(
      (result, donationId) => {
        const donation = donationMap.get(donationId);

        if (!donation) {
          result[donationId] = false;
          return result;
        }

        if (donation.status !== DonationStatusValues.PUBLISHED) {
          result[donationId] = false;
          return result;
        }

        if (donation.quantity <= 0) {
          result[donationId] = false;
          return result;
        }

        if (donationsWithActiveReservation.has(donationId)) {
          result[donationId] = false;
          return result;
        }

        result[donationId] = true;
        return result;
      },
      {} as Record<string, boolean>,
    );
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
