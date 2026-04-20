import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationAlertTypes1776200000000 implements MigrationInterface {
  name = 'AddNotificationAlertTypes1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'Report_alert'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'Account_status_alert'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be safely removed in a reversible way.
  }
}
