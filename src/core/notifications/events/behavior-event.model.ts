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
  category?: string;
  urgency?: string;
  distanceBucket?: SearchDistanceBucket;
  origin?: SearchViewOrigin;
};

export type DonationPublishedEvent = BehaviorEventBase & {
  eventName: (typeof BEHAVIOR_EVENT_NAME)['DONATION_PUBLISHED'];
  donorId: string;
  donationTitle: string;
  donationId: string;
  category: string;
  urgency: string;
  safetyChecklistCompleted: boolean;
};
export type LikedDonationEvent=BehaviorEventBase &{
  eventName: (typeof BEHAVIOR_EVENT_NAME)['LIKED_DONATION'];
  donationId: string;
  donationTitle:string
  category: string;
}

export type SmartBehaviorEvent =
  | BeneficiarySearchPerformedEvent
  | DonationPublishedEvent;
