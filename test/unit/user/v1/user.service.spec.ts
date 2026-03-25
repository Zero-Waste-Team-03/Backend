import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/core/user/v1/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/core/user/entities/user.entity';
import { Location } from 'src/common/locations/entities/location.entity';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Location), useValue: {} },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
