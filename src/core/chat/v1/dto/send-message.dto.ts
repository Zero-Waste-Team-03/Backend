import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsUUID()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
