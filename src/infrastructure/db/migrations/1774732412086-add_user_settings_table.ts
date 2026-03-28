import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSettingsTable1774732412086 implements MigrationInterface {
  name = 'AddUserSettingsTable1774732412086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_settings_appearance_enum" AS ENUM('System', 'Dark', 'Light')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_settings" ("id" uuid NOT NULL, "isNewDonationsAlertsEnabled" boolean NOT NULL DEFAULT true, "isUrgentAlertsEnabled" boolean NOT NULL DEFAULT true, "isSystemReports" boolean NOT NULL DEFAULT false, "appearance" "public"."user_settings_appearance_enum" NOT NULL DEFAULT 'System', "userId" uuid NOT NULL, CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"), CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastChangedPasswordDate" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "lastChangedPasswordDate"`,
    );
    await queryRunner.query(`DROP TABLE "user_settings"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_settings_appearance_enum"`,
    );
  }
}
