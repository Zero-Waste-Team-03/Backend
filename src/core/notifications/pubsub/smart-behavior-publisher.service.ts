import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'nestjs-redis-client';
import {
  BEHAVIOR_EVENT_NAME,
  REDIS_PUBSUB_CHANNELS,
  SearchDistanceBucket,
  SearchViewOrigin,
} from 'src/common/constants/redis-pubsub';
import {
  BeneficiarySearchPerformedEvent,
  DonationPublishedEvent,
} from '../events/behavior-event.model';
import { randomUUID } from 'crypto';

type BeneficiarySearchPayload = {
  userId: string;
  categoryId?: string;
  urgency?: string;
  distanceBucket?: SearchDistanceBucket;
  origin?: SearchViewOrigin;
};

type DonationPublishedPayload = {
  donorId: string;
  donationId: string;
  categoryId: string;
  urgency: string;
  safetyChecklistCompleted: boolean;
};

@Injectable()
export class SmartBehaviorPublisherService {
  private readonly logger = new Logger(SmartBehaviorPublisherService.name);

  constructor(private readonly redisService: RedisService) {}

  async publishBeneficiarySearchPerformed(
    payload: BeneficiarySearchPayload,
  ): Promise<void> {
    const event: BeneficiarySearchPerformedEvent = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      eventName: BEHAVIOR_EVENT_NAME.BENEFICIARY_SEARCH_PERFORMED,
      userId: payload.userId,
      categoryId: payload.categoryId,
      urgency: payload.urgency,
      distanceBucket: payload.distanceBucket,
      origin: payload.origin,
    };

    await this.redisService.publish(
      REDIS_PUBSUB_CHANNELS.SMART_BEHAVIOR_EVENTS,
      JSON.stringify(event),
    );
  }

  async publishDonationPublished(
    payload: DonationPublishedPayload,
  ): Promise<void> {
    const event: DonationPublishedEvent = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      eventName: BEHAVIOR_EVENT_NAME.DONATION_PUBLISHED,
      donorId: payload.donorId,
      donationId: payload.donationId,
      categoryId: payload.categoryId,
      urgency: payload.urgency,
      safetyChecklistCompleted: payload.safetyChecklistCompleted,
    };

    await this.redisService.publish(
      REDIS_PUBSUB_CHANNELS.SMART_BEHAVIOR_EVENTS,
      JSON.stringify(event),
    );
  }

  async safePublishBeneficiarySearchPerformed(
    payload: BeneficiarySearchPayload,
  ): Promise<void> {
    try {
      await this.publishBeneficiarySearchPerformed(payload);
    } catch {
      this.logger.warn({
        message: 'Failed to publish beneficiary behavior event',
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
      this.logger.warn({
        message: 'Failed to publish donation behavior event',
        donorId: payload.donorId,
        donationId: payload.donationId,
        context: 'SmartBehaviorPublisher',
      });
    }
  }
}
