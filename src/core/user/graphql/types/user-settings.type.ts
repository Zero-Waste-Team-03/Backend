import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AppearanceTheme } from '../../entities/user-settings.entity';

registerEnumType(AppearanceTheme, {
  name: 'AppearanceTheme',
  description: 'Available UI themes for the application',
});

@ObjectType('UserSettings')
export class UserSettingsType {
  @Field(() => String)
  id: string;

  @Field(() => Boolean, { defaultValue: true })
  isNewDonationsAlertsEnabled: boolean;

  @Field(() => Boolean, { defaultValue: true })
  isUrgentAlertsEnabled: boolean;

  @Field(() => Boolean, { defaultValue: false })
  isSystemReports: boolean;

  @Field(() => Boolean, { defaultValue: true })
  isPushNotificationsEnabled: boolean;

  @Field(() => AppearanceTheme, { defaultValue: AppearanceTheme.SYSTEM })
  appearance: AppearanceTheme;

  @Field(() => String)
  userId: string;
}
