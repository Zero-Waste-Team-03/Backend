import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetVersionToUser1774212976290 implements MigrationInterface {
  name = 'AddResetVersionToUser1774212976290';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "resetVersion" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resetVersion"`);
  }
}
