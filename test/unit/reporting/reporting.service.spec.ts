import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportingService } from 'src/core/reporting/reporting.service';
import {
  Report,
  ReportStatusValues,
  ReportTargetTypeValues,
} from 'src/core/reporting/entities/report.entity';
import { Donation } from 'src/core/donation/entities/donation.entity';
import { Message } from 'src/core/chat/entities/message.entity';
import { User } from 'src/core/user/entities/user.entity';
import { ConflictException } from '@nestjs/common';

describe('ReportingService', () => {
  let service: ReportingService;

  const reportRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const donationRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const messageRepository = {
    findOne: jest.fn(),
  };

  const userRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: getRepositoryToken(Report), useValue: reportRepository },
        { provide: getRepositoryToken(Donation), useValue: donationRepository },
        { provide: getRepositoryToken(Message), useValue: messageRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
  });

  it('creates a report for donation target', async () => {
    donationRepository.findOne.mockResolvedValue({ id: 'donation-1' });
    reportRepository.findOne.mockResolvedValue(null);
    reportRepository.create.mockImplementation((value) => value);
    reportRepository.save.mockImplementation(async (value) => value);

    const result = await service.createReport(
      {
        targetType: ReportTargetTypeValues.DONATION,
        targetId: '86ed8ec2-4a5b-4a2a-8de6-d719f92d2f7b',
        reason: 'Unsafe content',
        description: 'Suspicious donation details',
      },
      'fbb8477d-585a-47fc-b7ac-a4287f99de8d',
    );

    expect(result.targetType).toBe(ReportTargetTypeValues.DONATION);
    expect(result.status).toBe(ReportStatusValues.OPEN);
    expect(reportRepository.save).toHaveBeenCalled();
  });

  it('rejects duplicate open report for same target and reporter', async () => {
    donationRepository.findOne.mockResolvedValue({ id: 'donation-1' });
    reportRepository.findOne.mockResolvedValue({ id: 'report-1' });

    await expect(
      service.createReport(
        {
          targetType: ReportTargetTypeValues.DONATION,
          targetId: '86ed8ec2-4a5b-4a2a-8de6-d719f92d2f7b',
          reason: 'Duplicate',
        },
        'fbb8477d-585a-47fc-b7ac-a4287f99de8d',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
