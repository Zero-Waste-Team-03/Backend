import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewPhoneNumberFielde1775050652714 implements MigrationInterface {
  name = 'AddNewPhoneNumberFielde1775050652714';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phoneNumber" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb" FOREIGN KEY ("avatarAttachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phoneNumber"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb" FOREIGN KEY ("avatarAttachmentId") REFERENCES "attachments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
