import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterLocationDto {
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Latitude for user location',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    type: Number,
    required: false,
    description: 'Longitude for user location',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Neighborhood for user location',
  })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'City for user location',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Country for user location',
  })
  @IsOptional()
  @IsString()
  country?: string;
}

export class registerDto {
  @ApiProperty({
    type: String,
    required: false,
    description: 'Display name for the new user',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @ApiProperty({
    type: String,
    description: 'Email address for the new user',
  })
  @IsEmail()
  email: string;
  @ApiProperty({
    type: String,
    description: 'Password for the new user , must be strong and secure',
  })
  @IsStrongPassword()
  password: string;
  @ApiProperty({
    type: RegisterLocationDto,
    description: 'Location payload for user registration',
  })
  @ValidateNested()
  @Type(() => RegisterLocationDto)
  location: RegisterLocationDto;
}
