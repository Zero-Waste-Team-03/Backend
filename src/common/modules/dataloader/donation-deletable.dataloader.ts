import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ReservationService } from '../../../core/reservation/reservation.service';

@Injectable()
export class DonationDeletableDataLoader {
  constructor(private readonly reservationService: ReservationService) {}

  createLoader(
    viewerUserId: string,
    isAdmin: boolean,
  ): DataLoader<string, boolean> {
    return new DataLoader<string, boolean>(
      async (donationIds: readonly string[]) => {
        const results = await this.reservationService.canDeleteDonations(
          donationIds,
          viewerUserId,
          isAdmin,
        );

        return donationIds.map((id) => results[id] ?? false);
      },
      {
        cache: true,
        batch: true,
      },
    );
  }
}