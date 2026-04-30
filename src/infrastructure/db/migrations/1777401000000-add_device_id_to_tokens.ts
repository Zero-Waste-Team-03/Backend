import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceIdToTokens1777401000000 implements MigrationInterface {
  name = 'AddDeviceIdToTokens1777401000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tokens are ephemeral; clients re-register on next app open.
    // Clearing the table lets us add NOT NULL deviceId without backfilling.
    await queryRunner.query(`DELETE FROM "tokens"`);
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "UQ_8fc1530188edc052889333b92a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD "deviceId" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "UQ_tokens_userId_deviceId" UNIQUE ("userId", "deviceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "UQ_tokens_userId_deviceId"`,
    );
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "deviceId"`);
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "UQ_8fc1530188edc052889333b92a6" UNIQUE ("fcmToken")`,
    );
  }
}
