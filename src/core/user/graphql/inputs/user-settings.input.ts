import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AppearanceTheme } from '../../../user/entities/user-settings.entity';

@InputType()
export class UserSettingsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isNewDonationsAlertsEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isUrgentAlertsEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isSystemReports?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPushNotificationsEnabled?: boolean;

  @Field(() => AppearanceTheme, { nullable: true })
  @IsOptional()
  @IsEnum(AppearanceTheme)
  appearance?: AppearanceTheme;
}
