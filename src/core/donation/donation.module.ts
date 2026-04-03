import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './entities/donation.entity';
import { DonationResolver } from './donation.resolver';
import { DonationService } from './v1/donation.service';
import { DonationPhoto } from './entities/donation-photo.entity';
import { Location } from 'src/common/locations/entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, DonationPhoto, Location])],
  providers: [DonationResolver, DonationService],
  exports: [DonationService],
})
export class DonationModule {}
