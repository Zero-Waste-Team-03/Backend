import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationService } from './reservation.service';
import { ReservationResolver } from './reservation.resolver';
import { Reservation } from './entities/reservation.entity';
import { Donation } from '../donation/entities/donation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Donation])],
  providers: [ReservationResolver, ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}
