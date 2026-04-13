import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { DonationService } from '../../../core/donation/v1/donation.service';

/**
 * DataLoader for Donation entity to solve N+1 query problem
 */
@Injectable()
export class DonationDataLoader {
  constructor(private readonly donationService: DonationService) {}

  /**
   * Creates a new DataLoader instance for batching donation queries by ID
   *
   * @returns DataLoader instance for Donation entities
   */
  createLoader(viewerUserId?: string): DataLoader<string, any | null> {
    return new DataLoader<string, any | null>(
      async (donationIds: readonly string[]) => {
        const donations = await this.donationService.findByIds(
          donationIds as string[],
          viewerUserId,
        );

        const donationMap = donations.reduce(
          (map, donation) => {
            map[donation.id] = donation;
            return map;
          },
          {} as Record<string, any>,
        );

        return donationIds.map((id) => donationMap[id] || null);
      },
      {
        cache: true,
        batch: true,
      },
    );
  }
}
