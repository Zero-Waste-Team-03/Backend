import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTokenDto {
  @ApiProperty({
    description: 'The fcm token string.',
    example: 'dummytoken1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
