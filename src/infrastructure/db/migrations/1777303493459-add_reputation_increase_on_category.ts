import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReputationIncreaseOnCategory1777303493459
  implements MigrationInterface
{
  name = 'AddReputationIncreaseOnCategory1777303493459';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "reputationGain" integer NOT NULL DEFAULT 10`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN "reputationGain"`,
    );
  }
}
