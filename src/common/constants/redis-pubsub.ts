export const REDIS_PUBSUB_CHANNELS = {
  SMART_NOTIFICATION_COMMAND: 'smart.notifications.command.v1',
  SMART_BEHAVIOR_EVENTS: 'smart.behavior.events.v1',
} as const;

export const BEHAVIOR_EVENT_NAME = {
  BENEFICIARY_SEARCH_PERFORMED: 'BeneficiarySearchPerformed',
  DONATION_PUBLISHED: 'DonationPublished',
} as const;

export const SEARCH_DISTANCE_BUCKETS = ['500m', '1km', '5km'] as const;
export type SearchDistanceBucket = (typeof SEARCH_DISTANCE_BUCKETS)[number];

export const SEARCH_VIEW_ORIGINS = ['map', 'list'] as const;
export type SearchViewOrigin = (typeof SEARCH_VIEW_ORIGINS)[number];
