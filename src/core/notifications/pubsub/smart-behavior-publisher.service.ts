import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { RedisService } from 'nestjs-redis-client';
import {
  BEHAVIOR_EVENT_NAME,
  REDIS_PUBSUB_CHANNELS,
  SearchDistanceBucket,
  SearchViewOrigin,
} from 'src/common/constants/redis-pubsub';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { BEHAVIOR_EVENT_JOBS } from 'src/common/constants/jobs';
import {
  BeneficiarySearchJobPayload,
  BeneficiarySearchPerformedEvent,
  DonationPublishedEvent,
  DonationPublishedJobPayload,
  LikedDonationEvent,
  LikedDonationJobPayload,
} from '../events/behavior-event.model';
import { randomUUID } from 'crypto';

type BeneficiarySearchPayload = {
  userId: string;
  categoryId?: string;
  category?: string;
  urgency?: string;
  distanceBucket?: SearchDistanceBucket;
  origin?: SearchViewOrigin;
};

type DonationPublishedPayload = {
  donorId: string;
  donationId: string;
  donationTitle: string;
  categoryId: string;
  category: string;
  urgency: string;
  safetyChecklistCompleted: boolean;
};

type LikedDonationPayload = {
  donationId: string;
  likerUserId: string;
};

const JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  removeOnFail: 1000,
};

@Injectable()
export class SmartBehaviorPublisherService {
  private readonly logger = new Logger(SmartBehaviorPublisherService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectQueue(QUEUE_NAME.BEHAVIOR_EVENTS)
    private readonly behaviorEventsQueue: Queue,
  ) {}

  async publishLikedDonation(payload: LikedDonationPayload): Promise<void> {
    const job: LikedDonationJobPayload = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      donationId: payload.donationId,
      likerUserId: payload.likerUserId,
    };

    await this.behaviorEventsQueue.add(
      BEHAVIOR_EVENT_JOBS.PUBLISH_LIKED_DONATION,
      job,
      JOB_OPTS,
    );
  }

  async publishBeneficiarySearchPerformed(
    payload: BeneficiarySearchPayload,
  ): Promise<void> {
    const job: BeneficiarySearchJobPayload = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      userId: payload.userId,
      category: payload.category,
      urgency: payload.urgency,
      distanceBucket: payload.distanceBucket,
      origin: payload.origin,
    };

    await this.behaviorEventsQueue.add(
      BEHAVIOR_EVENT_JOBS.PUBLISH_BENEFICIARY_SEARCH,
      job,
      JOB_OPTS,
    );
  }

  async publishDonationPublished(
    payload: DonationPublishedPayload,
  ): Promise<void> {
    const job: DonationPublishedJobPayload = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      donorId: payload.donorId,
      donationId: payload.donationId,
      donationTitle: payload.donationTitle,
      category: payload.category,
      urgency: payload.urgency,
      safetyChecklistCompleted: payload.safetyChecklistCompleted,
    };

    await this.behaviorEventsQueue.add(
      BEHAVIOR_EVENT_JOBS.PUBLISH_DONATION_PUBLISHED,
      job,
      JOB_OPTS,
    );
  }

  async safePublishBeneficiarySearchPerformed(
    payload: BeneficiarySearchPayload,
  ): Promise<void> {
    try {
      await this.publishBeneficiarySearchPerformed(payload);
    } catch {
      this.logger.warn('Failed to enqueue beneficiary behavior event', {
        userId: payload.userId,
        context: 'SmartBehaviorPublisher',
      });
    }
  }

  async safePublishDonationPublished(
    payload: DonationPublishedPayload,
  ): Promise<void> {
    try {
      await this.publishDonationPublished(payload);
    } catch {
      this.logger.warn('Failed to enqueue donation behavior event', {
        donorId: payload.donorId,
        donationId: payload.donationId,
        context: 'SmartBehaviorPublisher',
      });
    }
  }

  async emitLikedDonation(event: LikedDonationEvent): Promise<void> {
    this.logger.log('Emitting liked donation event', {
      eventId: event.eventId,
      donationId: event.donationId,
      likerUserId: event.likerUserId,
    });
    await this.redisService.publish(
      REDIS_PUBSUB_CHANNELS.SMART_BEHAVIOR_EVENTS,
      JSON.stringify({
        ...event,
        eventName: BEHAVIOR_EVENT_NAME.LIKED_DONATION,
      }),
    );
  }

  async emitDonationPublished(event: DonationPublishedEvent): Promise<void> {
    this.logger.log('Emitting donation published event', {
      eventId: event.eventId,
      donationId: event.donationId,
      donorId: event.donorId,
    });
    await this.redisService.publish(
      REDIS_PUBSUB_CHANNELS.SMART_BEHAVIOR_EVENTS,
      JSON.stringify({
        ...event,
        eventName: BEHAVIOR_EVENT_NAME.DONATION_PUBLISHED,
      }),
    );
  }

  async emitBeneficiarySearchPerformed(
    event: BeneficiarySearchPerformedEvent,
  ): Promise<void> {
    this.logger.log('Emitting beneficiary search performed event', {
      eventId: event.eventId,
      userId: event.userId,
    });
    await this.redisService.publish(
      REDIS_PUBSUB_CHANNELS.SMART_BEHAVIOR_EVENTS,
      JSON.stringify({
        ...event,
        eventName: BEHAVIOR_EVENT_NAME.BENEFICIARY_SEARCH_PERFORMED,
      }),
    );
  }
}
