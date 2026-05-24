import { SetMetadata } from '@nestjs/common';

export interface SameNeighborhoodOptions {
  entityType: 'USER' | 'DONATION';
  argName: string;
}

export const SAME_NEIGHBORHOOD_KEY = 'sameNeighborhood';

export const SameNeighborhood = (options: SameNeighborhoodOptions) =>
  SetMetadata(SAME_NEIGHBORHOOD_KEY, options);
