import { Test, TestingModule } from '@nestjs/testing';
import { ReservationCompletionService } from 'src/core/reservation-completion/reservation-completion.service';
import { ReservationService } from 'src/core/reservation/reservation.service';
import { ChatService } from 'src/core/chat/chat.service';

describe('ReservationCompletionService', () => {
  let service: ReservationCompletionService;
  let reservationService: {
    findMyReservationById: jest.Mock;
  };
  let chatService: {
    getOrCreateConversation: jest.Mock;
    markTransactionCompleted: jest.Mock;
  };

  beforeEach(async () => {
    reservationService = {
      findMyReservationById: jest.fn(),
    };

    chatService = {
      getOrCreateConversation: jest.fn(),
      markTransactionCompleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationCompletionService,
        {
          provide: ReservationService,
          useValue: reservationService,
        },
        {
          provide: ChatService,
          useValue: chatService,
        },
      ],
    }).compile();

    service = module.get<ReservationCompletionService>(
      ReservationCompletionService,
    );
  });

  it('orchestrates completion using reservation id only', async () => {
    const reservation = { id: 'r1' };

    reservationService.findMyReservationById
      .mockResolvedValueOnce(reservation)
      .mockResolvedValueOnce(reservation);
    chatService.getOrCreateConversation.mockResolvedValue({ id: 'conv-1' });
    chatService.markTransactionCompleted.mockResolvedValue({ id: 'conv-1' });

    const result = await service.confirmReservationCompleted('r1', 'u1');

    expect(reservationService.findMyReservationById).toHaveBeenNthCalledWith(
      1,
      'r1',
      'u1',
    );
    expect(chatService.getOrCreateConversation).toHaveBeenCalledWith(
      'r1',
      'u1',
    );
    expect(chatService.markTransactionCompleted).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'u1',
    });
    expect(reservationService.findMyReservationById).toHaveBeenNthCalledWith(
      2,
      'r1',
      'u1',
    );
    expect(result).toEqual(reservation);
  });
});
