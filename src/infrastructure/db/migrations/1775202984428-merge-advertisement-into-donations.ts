import { MigrationInterface, QueryRunner } from "typeorm";

export class MergeAdvertisementIntoDonations1775202984428 implements MigrationInterface {
    name = 'MergeAdvertisementIntoDonations1775202984428'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_user"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_category"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_attachment"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_expiry_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_id_user_id"`);
        await queryRunner.query(`CREATE TABLE "donation_photos" ("donationId" uuid NOT NULL, "attachmentId" uuid NOT NULL, "isMain" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_46f78149b2d790c6b74c3976bba" PRIMARY KEY ("donationId", "attachmentId"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_donation_photos_main_per_donation" ON "donation_photos" ("donationId") WHERE "isMain" = true`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "attachmentId"`);
        await queryRunner.query(`CREATE TYPE "public"."donations_urgency_enum" AS ENUM('Low', 'Medium', 'High')`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "urgency" "public"."donations_urgency_enum" NOT NULL DEFAULT 'Medium'`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "safetyChecklistCompleted" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "locationId" uuid`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "publishedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "listingExpiresAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "donation_photos" ADD CONSTRAINT "FK_008e2c57b31289c7404420d6eae" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donation_photos" ADD CONSTRAINT "FK_a45b12fb43866171028eafd0812" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_cfd5edc39019b9001bd86e90f77" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_334c9a38d141068afb8c9fa72d7" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_6c3c8e04d27520f842a8052bce9" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_6c3c8e04d27520f842a8052bce9"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_334c9a38d141068afb8c9fa72d7"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_cfd5edc39019b9001bd86e90f77"`);
        await queryRunner.query(`ALTER TABLE "donation_photos" DROP CONSTRAINT "FK_a45b12fb43866171028eafd0812"`);
        await queryRunner.query(`ALTER TABLE "donation_photos" DROP CONSTRAINT "FK_008e2c57b31289c7404420d6eae"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "listingExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "publishedAt"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "locationId"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "safetyChecklistCompleted"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "urgency"`);
        await queryRunner.query(`DROP TYPE "public"."donations_urgency_enum"`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "attachmentId" uuid`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donation_photos_main_per_donation"`);
        await queryRunner.query(`DROP TABLE "donation_photos"`);
        await queryRunner.query(`CREATE INDEX "IDX_donations_id_user_id" ON "donations" ("id", "userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_expiry_date" ON "donations" ("expiryDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_status" ON "donations" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_user_id" ON "donations" ("userId") `);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_attachment" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
