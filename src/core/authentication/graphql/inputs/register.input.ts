import { Field, InputType } from '@nestjs/graphql';
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

@InputType()
export class RegisterLocationInput {
  @Field(() => Number, {
    nullable: true,
    description: 'Latitude for user location',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Longitude for user location',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Neighborhood for user location',
  })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @Field(() => String, {
    nullable: true,
    description: 'City for user location',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Country for user location',
  })
  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * Input type for register mutation
 *
 * @example
 * mutation {
 *   register(
 *     otp: "123456"
 *     registerInput: {
 *       displayName: "John Doe"
 *       email: "john@example.com"
 *       password: "StrongPass123!"
 *       confirmPassword: "StrongPass123!"
 *       location: {
 *         latitude: 36.7525
 *         longitude: 3.042
 *         city: "Algiers"
 *         country: "Algeria"
 *       }
 *     }
 *   ) {
 *     message
 *   }
 * }
 */
@InputType()
export class RegisterInput {
  @Field(() => String, {
    nullable: true,
    description: 'Display name for the new user',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @Field(() => String, { description: 'Email address for the new user' })
  @IsEmail()
  email: string;

  @Field(() => String, {
    description: 'Password for the new user, must be strong and secure',
  })
  @IsStrongPassword()
  password: string;
  @Field(() => String, {
    description:
      'Phone number of the user, optional but if provided must be a valid string',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @Field(() => RegisterLocationInput, {
    description: 'Location payload for user registration',
  })
  @ValidateNested()
  @Type(() => RegisterLocationInput)
  location: RegisterLocationInput;
}
