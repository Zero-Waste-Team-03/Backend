import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncDonationIndexes1775203063047 implements MigrationInterface {
    name = 'SyncDonationIndexes1775203063047'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_donation_photos_donation_id" ON "donation_photos" ("donationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_listing_expires_at" ON "donations" ("listingExpiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_location_id" ON "donations" ("locationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_id_user_id" ON "donations" ("id", "userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_expiry_date" ON "donations" ("expiryDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_status" ON "donations" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_donations_user_id" ON "donations" ("userId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_expiry_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_id_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_location_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donations_listing_expires_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_donation_photos_donation_id"`);
    }

}
