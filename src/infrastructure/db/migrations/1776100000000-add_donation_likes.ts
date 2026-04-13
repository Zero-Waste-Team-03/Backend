import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDonationLikes1776100000000 implements MigrationInterface {
  name = 'AddDonationLikes1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "donation_likes" ("userId" uuid NOT NULL, "donationId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_donation_likes_user_donation" PRIMARY KEY ("userId", "donationId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_likes_user_created_at" ON "donation_likes" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_likes_donation_id" ON "donation_likes" ("donationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_donation_likes_user_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_donation_likes_donation_id" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_donation_likes_donation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_donation_likes_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_donation_likes_donation_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_donation_likes_user_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "donation_likes"`);
  }
}
