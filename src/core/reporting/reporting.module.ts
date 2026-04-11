import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportingService } from './reporting.service';
import { ReportingResolver } from './reporting.resolver';
import { Donation } from '../donation/entities/donation.entity';
import { Message } from '../chat/entities/message.entity';
import { User } from '../user/entities/user.entity';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Donation, Message, User])],
  providers: [ReportingService, ReportingResolver],
  controllers: [ReportingController],
  exports: [ReportingService],
})
export class ReportingModule {}
