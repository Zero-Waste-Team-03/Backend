import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsResolver } from './stats.resolver';
import { StatsService } from './stats.service';
import { Donation } from '../donation/entities/donation.entity';
import { User } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, User]), UserModule],
  providers: [StatsResolver, StatsService],
  exports: [StatsService],
})
export class StatsModule {}
