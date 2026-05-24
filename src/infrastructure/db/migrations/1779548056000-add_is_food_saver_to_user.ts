import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFoodSaverToUser1779548056000 implements MigrationInterface {
  name = 'AddIsFoodSaverToUser1779548056000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isFoodSaver" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isFoodSaver"`);
  }
}
