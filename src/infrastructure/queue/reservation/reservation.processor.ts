import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { Logger } from '@nestjs/common';
import { ReservationService } from 'src/core/reservation/reservation.service';

@Processor(QUEUE_NAME.RESERVATION)
export class ReservationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReservationProcessor.name);

  constructor(private readonly reservationService: ReservationService) {
    super();
  }

  async process(job: Job<{ reservationId: string }>): Promise<void> {
    this.logger.log(
      `Processing reservation expiration job ${job.id} for reservation ${job.data.reservationId}`,
    );
    try {
      await this.reservationService.expireReservation(job.data.reservationId);
    } catch (error) {
      this.logger.error(
        `Failed to execute cancellation for reservation ${job.data.reservationId}`,
        error,
      );
      throw error;
    }
  }
}
