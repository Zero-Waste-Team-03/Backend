import {
  BEHAVIOR_EVENT_NAME,
  SearchDistanceBucket,
  SearchViewOrigin,
} from 'src/common/constants/redis-pubsub';

type BehaviorEventBase = {
  eventId: string;
  timestamp: string;
};

export type DonationLocationFragment = {
  city?: string | null;
  neighborhood?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  quantity: number;
  location?: DonationLocationFragment;
};

export type LikedDonationEvent = BehaviorEventBase & {
  eventName: (typeof BEHAVIOR_EVENT_NAME)['LIKED_DONATION'];
  donationId: string;
  donationTitle: string;
  category: string;
  userId: string;
  likerUserId: string;
  quantity: number;
  urgency: string;
  location?: DonationLocationFragment;
};

export type SmartBehaviorEvent =
  | BeneficiarySearchPerformedEvent
  | DonationPublishedEvent
  | LikedDonationEvent;

export type LikedDonationJobPayload = BehaviorEventBase &
  Pick<LikedDonationEvent, 'donationId' | 'likerUserId'>;

export type DonationPublishedJobPayload = BehaviorEventBase &
  Omit<
    DonationPublishedEvent,
    keyof BehaviorEventBase | 'eventName' | 'quantity' | 'location'
  >;

export type BeneficiarySearchJobPayload = BehaviorEventBase &
  Omit<BeneficiarySearchPerformedEvent, keyof BehaviorEventBase | 'eventName'>;
