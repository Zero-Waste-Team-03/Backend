import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from './entities/badge.entity';
import { Achievement } from './entities/achievement.entity';
import { GamificationService } from './gamification.service';
import { GamificationResolver } from './gamification.resolver';
import { AttachmentModule } from 'src/common/modules/attachment/attachment.module';

@Module({
  imports: [TypeOrmModule.forFeature([Badge, Achievement]), AttachmentModule],
  providers: [GamificationService, GamificationResolver],
  exports: [GamificationService],
})
export class GamificationModule {}
