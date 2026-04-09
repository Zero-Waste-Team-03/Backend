import {
  BEHAVIOR_EVENT_NAME,
  SearchDistanceBucket,
  SearchViewOrigin,
} from 'src/common/constants/redis-pubsub';

type BehaviorEventBase = {
  eventId: string;
  timestamp: string;
};

export type BeneficiarySearchPerformedEvent = BehaviorEventBase & {
  eventName: (typeof BEHAVIOR_EVENT_NAME)['BENEFICIARY_SEARCH_PERFORMED'];
  userId: string;
  categoryId?: string;
  urgency?: string;
  distanceBucket?: SearchDistanceBucket;
  origin?: SearchViewOrigin;
};

export type DonationPublishedEvent = BehaviorEventBase & {
  eventName: (typeof BEHAVIOR_EVENT_NAME)['DONATION_PUBLISHED'];
  donorId: string;
  donationId: string;
  categoryId: string;
  urgency: string;
  safetyChecklistCompleted: boolean;
};

export type SmartBehaviorEvent =
  | BeneficiarySearchPerformedEvent
  | DonationPublishedEvent;
