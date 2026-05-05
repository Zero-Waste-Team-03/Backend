import { IsNotEmpty, IsUUID } from 'class-validator';

export class MarkTransactionCompletedDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
