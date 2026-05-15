import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ReservationService } from '../../../core/reservation/reservation.service';

/**
 * DataLoader for donation reservable checks to batch per request.
 */
@Injectable()
export class DonationReservableDataLoader {
  constructor(private readonly reservationService: ReservationService) {}

  createLoader(beneficiaryId: string): DataLoader<string, boolean> {
    return new DataLoader<string, boolean>(
      async (donationIds: readonly string[]) => {
        const results = await this.reservationService.canUserReserveDonations(
          donationIds,
          beneficiaryId,
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
