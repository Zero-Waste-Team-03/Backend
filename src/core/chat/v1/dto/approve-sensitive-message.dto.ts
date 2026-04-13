import { IsNotEmpty, IsUUID } from 'class-validator';

export class ApproveSensitiveMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsUUID()
  @IsNotEmpty()
  approverId: string;
}
