import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertLocationIdToNullable1774223683400 implements MigrationInterface {
  name = 'ConvertLocationIdToNullable1774223683400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_49acb911ee20b02f86ec532a122"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "locationId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_49acb911ee20b02f86ec532a122" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_49acb911ee20b02f86ec532a122"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "locationId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_49acb911ee20b02f86ec532a122" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
