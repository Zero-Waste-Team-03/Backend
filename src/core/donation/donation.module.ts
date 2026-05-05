import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './entities/donation.entity';
import {
  DonationResolver,
  DonationMapMarkerResolver,
} from './donation.resolver';
import { DonationService } from './v1/donation.service';
import { DonationPhoto } from './entities/donation-photo.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { User } from '../user/entities/user.entity';
import { DonationLike } from './entities/donation-like.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Donation,
      DonationPhoto,
      DonationLike,
      Location,
      Reservation,
      User,
    ]),
  ],
  providers: [DonationResolver, DonationService, DonationMapMarkerResolver],
  exports: [DonationService],
})
export class DonationModule {}
