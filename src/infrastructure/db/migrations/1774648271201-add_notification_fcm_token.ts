import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationFcmToken1774648271201 implements MigrationInterface {
  name = 'AddNotificationFcmToken1774648271201';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "os"`);
    await queryRunner.query(`DROP TYPE "public"."tokens_os_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tokens_os_enum" AS ENUM('android', 'ios', 'web')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD "os" "public"."tokens_os_enum" NOT NULL`,
    );
  }
}
