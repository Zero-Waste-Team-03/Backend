import { Test, TestingModule } from '@nestjs/testing';
import { ReservationCompletionResolver } from 'src/core/reservation-completion/reservation-completion.resolver';
import { ReservationCompletionService } from 'src/core/reservation-completion/reservation-completion.service';

describe('ReservationCompletionResolver', () => {
  let resolver: ReservationCompletionResolver;
  let service: {
    confirmReservationCompleted: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      confirmReservationCompleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationCompletionResolver,
        {
          provide: ReservationCompletionService,
          useValue: service,
        },
      ],
    }).compile();

    resolver = module.get<ReservationCompletionResolver>(
      ReservationCompletionResolver,
    );
  });

  it('delegates completion confirmation to orchestration service', async () => {
    const reservation = { id: 'r1' };
    service.confirmReservationCompleted.mockResolvedValue(reservation);

    const result = await resolver.confirmReservationCompleted('r1', 'u1');

    expect(service.confirmReservationCompleted).toHaveBeenCalledWith(
      'r1',
      'u1',
    );
    expect(result).toEqual(reservation);
  });
});
