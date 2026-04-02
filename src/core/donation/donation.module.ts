import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './entities/donation.entity';
import { DonationResolver } from './donation.resolver';
import { DonationService } from './v1/donation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Donation])],
  providers: [DonationResolver, DonationService],
  exports: [DonationService],
})
export class DonationModule {}
