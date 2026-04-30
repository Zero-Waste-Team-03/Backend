import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushNotificationsEnabledToUserSettings1777400000000
  implements MigrationInterface
{
  name = 'AddPushNotificationsEnabledToUserSettings1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD "isPushNotificationsEnabled" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN "isPushNotificationsEnabled"`,
    );
  }
}
