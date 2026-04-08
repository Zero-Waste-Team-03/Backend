import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { RESERVATION_JOBS } from 'src/common/constants/jobs';
import { Reservation, ReservationStatusValues } from './entities/reservation.entity';
import { Donation, DonationStatusValues } from '../donation/entities/donation.entity';
import { throwAppError } from 'src/common/errors/throw-app-error';

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
  ) {}

  public async expireReservation(reservationId: string) {
      await this.reservationRepository.manager.transaction(async (manager) => {
        try{
        const reservation = await manager.findOneOrFail(Reservation, {
          where: { id: reservationId, status: ReservationStatusValues.PENDING },
          select: ['id', 'donationId'],
        });
        await manager.update(Donation, reservation.donationId, { status: DonationStatusValues.PUBLISHED });
        await manager.update(Reservation, reservationId, { status: ReservationStatusValues.CANCELLED });
        }catch {
          throwAppError('RESERVATION_NOT_FOUND', { id: reservationId , status: ReservationStatusValues.PENDING});
        }
        this.logger.log(`Reservation ${reservationId} has expired and was cancelled automatically.`);
      });
  }

  async reserveDonation(donationId: string, beneficiaryId: string): Promise<Reservation> {
    const donation = await this.donationRepository.findOne({ where: { id: donationId } });
    
    if (!donation) {
      throwAppError('DONATION_NOT_FOUND', { id: donationId });
    }

    if (donation.status !== DonationStatusValues.PUBLISHED) {
      throwAppError('DONATION_NOT_AVAILABLE', { id: donationId, status: donation.status });
    }

    const reservation = this.reservationRepository.create({
        donationId,
        beneficiaryId,
    });

    await this.reservationRepository.save(reservation);

    donation.status = DonationStatusValues.RESERVED;
    await this.donationRepository.save(donation);

    await this.reservationQueue.add(
      RESERVATION_JOBS.EXPIRE_RESERVATION,
      { reservationId: reservation.id },
      { 
        jobId: `reservation-${reservation.id}`,
        delay: this.EXPIRATION_TIME_MS, 
        removeOnComplete: true 
      }
    );

    this.logger.log(`Scheduled expiration job for reservation ${reservation.id} with ${this.EXPIRATION_TIME_MS / 1000}s delay`);

    return reservation;
  }

  async confirmReservation(reservationId: string, beneficiaryId: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({ where: { id: reservationId }, relations: ['donation'] });
    
    if (!reservation) {
      throwAppError('RESERVATION_NOT_FOUND', { id: reservationId, status: 'Not Found' });
    }

    if (reservation.beneficiaryId !== beneficiaryId) {
      throwAppError('RESERVATION_OWNERSHIP_INVALID');
    }

    if (reservation.status !== ReservationStatusValues.PENDING) {
      throwAppError('RESERVATION_STATUS_INVALID', { status: reservation.status });
    }

    reservation.status = ReservationStatusValues.CONFIRMED;
    reservation.confirmedAt = new Date();
    await this.reservationRepository.save(reservation);

    await this.reservationQueue.remove(`reservation-${reservationId}`);

    this.logger.log(`Reservation ${reservationId} confirmed by beneficiary ${beneficiaryId}`);

    return reservation;
  }
}
