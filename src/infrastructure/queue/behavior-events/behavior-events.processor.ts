import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BEHAVIOR_EVENT_JOBS } from 'src/common/constants/jobs';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { BEHAVIOR_EVENT_NAME } from 'src/common/constants/redis-pubsub';
import { Donation } from 'src/core/donation/entities/donation.entity';
import { SmartBehaviorPublisherService } from 'src/core/notifications/pubsub/smart-behavior-publisher.service';
import {
  BeneficiarySearchJobPayload,
  BeneficiarySearchPerformedEvent,
  DonationLocationFragment,
  DonationPublishedEvent,
  DonationPublishedJobPayload,
  LikedDonationEvent,
  LikedDonationJobPayload,
} from 'src/core/notifications/events/behavior-event.model';

type BehaviorJobPayload =
  | LikedDonationJobPayload
  | DonationPublishedJobPayload
  | BeneficiarySearchJobPayload;

@Processor(QUEUE_NAME.BEHAVIOR_EVENTS)
export class BehaviorEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(BehaviorEventsProcessor.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    private readonly smartBehaviorPublisher: SmartBehaviorPublisherService,
  ) {
    super();
  }

  async process(job: Job<BehaviorJobPayload>): Promise<void> {
    switch (job.name) {
      case BEHAVIOR_EVENT_JOBS.PUBLISH_LIKED_DONATION:
        await this.handleLikedDonation(job.data as LikedDonationJobPayload);
        return;
      case BEHAVIOR_EVENT_JOBS.PUBLISH_DONATION_PUBLISHED:
        await this.handleDonationPublished(
          job.data as DonationPublishedJobPayload,
        );
        return;
      case BEHAVIOR_EVENT_JOBS.PUBLISH_BENEFICIARY_SEARCH:
        await this.handleBeneficiarySearch(
          job.data as BeneficiarySearchJobPayload,
        );
        return;
      default:
        this.logger.warn('Unknown behavior-events job', {
          jobName: job.name,
          context: 'BehaviorEventsProcessor',
        });
    }
  }

  private async handleLikedDonation(
    job: LikedDonationJobPayload,
  ): Promise<void> {
    const donation = await this.donationRepository.findOne({
      where: { id: job.donationId },
      relations: { category: true, location: true },
    });

    if (!donation) {
      this.logger.warn('Liked donation hydration: donation not found', {
        donationId: job.donationId,
        eventId: job.eventId,
        context: 'BehaviorEventsProcessor',
      });
      return;
    }

    const event: LikedDonationEvent = {
      eventId: job.eventId,
      timestamp: job.timestamp,
      eventName: BEHAVIOR_EVENT_NAME.LIKED_DONATION,
      donationId: donation.id,
      donationTitle: donation.title,
      category: donation.category?.name ?? '',
      userId: donation.userId,
      likerUserId: job.likerUserId,
      quantity: donation.quantity,
      urgency: donation.urgency,
      location: this.mapLocation(donation.location),
    };

    await this.smartBehaviorPublisher.emitLikedDonation(event);
  }

  private async handleDonationPublished(
    job: DonationPublishedJobPayload,
  ): Promise<void> {
    const donation = await this.donationRepository.findOne({
      where: { id: job.donationId },
      relations: { location: true },
    });

    if (!donation) {
      this.logger.warn('Donation published hydration: donation not found', {
        donationId: job.donationId,
        eventId: job.eventId,
        context: 'BehaviorEventsProcessor',
      });
      return;
    }

    const event: DonationPublishedEvent = {
      eventId: job.eventId,
      timestamp: job.timestamp,
      eventName: BEHAVIOR_EVENT_NAME.DONATION_PUBLISHED,
      donorId: job.donorId,
      donationId: job.donationId,
      donationTitle: job.donationTitle,
      category: job.category,
      urgency: job.urgency,
      safetyChecklistCompleted: job.safetyChecklistCompleted,
      quantity: donation.quantity,
      location: this.mapLocation(donation.location),
    };

    await this.smartBehaviorPublisher.emitDonationPublished(event);
  }

  private async handleBeneficiarySearch(
    job: BeneficiarySearchJobPayload,
  ): Promise<void> {
    const event: BeneficiarySearchPerformedEvent = {
      eventId: job.eventId,
      timestamp: job.timestamp,
      eventName: BEHAVIOR_EVENT_NAME.BENEFICIARY_SEARCH_PERFORMED,
      userId: job.userId,
      category: job.category,
      urgency: job.urgency,
      distanceBucket: job.distanceBucket,
      origin: job.origin,
    };

    await this.smartBehaviorPublisher.emitBeneficiarySearchPerformed(event);
  }

  private mapLocation(
    location?: Donation['location'] | null,
  ): DonationLocationFragment | undefined {
    if (!location) {
      return undefined;
    }

    return {
      city: location.city ?? null,
      neighborhood: location.neighborhood ?? null,
      country: location.country ?? null,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.warn('Behavior-events job failed', {
      jobName: job?.name,
      jobId: job?.id,
      reason: err?.message,
      context: 'BehaviorEventsProcessor',
    });
  }
}
