import { Module } from '@nestjs/common';
import { VerificationResolver } from './verification.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRequest } from './verification-request.entity';
import { VerificationRequestsService } from './verification.service';
import { UserModule } from '../user/user.module';

@Module({
  providers: [VerificationResolver, VerificationRequestsService],
  imports: [TypeOrmModule.forFeature([VerificationRequest]),UserModule],
})
export class VerificationRequestModule {}
