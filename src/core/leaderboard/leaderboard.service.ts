import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReputationLog } from './entities/reputation-log.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(ReputationLog)
    private readonly reputationLogRepository: Repository<ReputationLog>,
  ) {}
}
