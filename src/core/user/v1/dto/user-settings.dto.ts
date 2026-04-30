import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AppearanceTheme } from '../../entities/user-settings.entity';

export class UserSettingsDto {
  @ApiPropertyOptional({
    description: 'Whether notification alerts for new donations are enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isNewDonationsAlertsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether notification alerts for urgent cases are enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isUrgentAlertsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether weekly system reports are enabled',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemReports?: boolean;

  @ApiPropertyOptional({
    description: 'Whether push notifications are enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPushNotificationsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Application theme preference',
    enum: AppearanceTheme,
    example: AppearanceTheme.SYSTEM,
  })
  @IsOptional()
  @IsEnum(AppearanceTheme)
  appearance?: AppearanceTheme;
}
