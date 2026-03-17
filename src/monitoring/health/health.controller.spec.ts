import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  HttpHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn() } },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: HttpHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: DiskHealthIndicator, useValue: { checkStorage: jest.fn() } },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn(), checkRSS: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
