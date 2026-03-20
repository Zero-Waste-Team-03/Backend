import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { UserService } from 'src/core/user/v1/user.service';
import { JwtService } from '@nestjs/jwt';
import authConfig from 'src/config/auth.config';
import { RedisService } from 'nestjs-redis-client';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UserService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: authConfig.KEY, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: AttachmentService, useValue: {} },
        { provide: getQueueToken(QUEUE_NAME.MAIL), useValue: {} },
        { provide: getQueueToken(QUEUE_NAME.UPLOAD), useValue: {} },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
