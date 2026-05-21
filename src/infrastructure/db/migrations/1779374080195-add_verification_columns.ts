import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVerificationColumns1779374080195 implements MigrationInterface {
    name = 'AddVerificationColumns1779374080195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_donation_likes_user_id"`);
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_donation_likes_donation_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "CHK_reservations_quantity_positive"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "isMailVerified" TO "isVerified"`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "approvedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "approvedById" uuid`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "rejectedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "rejectedById" uuid`);
        await queryRunner.query(`ALTER TABLE "donations" ADD "rejectionReason" text`);
        await queryRunner.query(`DRROP TRIGGER IF EXISTS "TRG_donations_enforce_quantity_status" ON "donations"`);

        await queryRunner.query(`ALTER TYPE "public"."donations_status_enum" RENAME TO "donations_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."donations_status_enum" AS ENUM('Draft', 'PendingApproval', 'Published', 'Reserved', 'Completed', 'Expired', 'Rejected')`);
        await queryRunner.query(`ALTER TABLE "donations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "donations" ALTER COLUMN "status" TYPE "public"."donations_status_enum" USING "status"::"text"::"public"."donations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "donations" ALTER COLUMN "status" SET DEFAULT 'Draft'`);
        await queryRunner.query(`CREATE TRIGGER "TRG_donations_enforce_quantity_status"
       BEFORE INSERT OR UPDATE OF "quantity", "status"
       ON "donations"
       FOR EACH ROW
       EXECUTE FUNCTION enforce_donation_quantity_status()`,
    );
        await queryRunner.query(`DROP TYPE "public"."donations_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_7077ec6121d0a9e056bab9a68b8" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_7dba28c33d8874fbba4c9f7751e" FOREIGN KEY ("rejectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_11aa166fb93661ed2a00a4cc548" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_d03591ec287235baa8139d1537a" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_d03591ec287235baa8139d1537a"`);
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_11aa166fb93661ed2a00a4cc548"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_7dba28c33d8874fbba4c9f7751e"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_7077ec6121d0a9e056bab9a68b8"`);
        await queryRunner.query(`CREATE TYPE "public"."donations_status_enum_old" AS ENUM('Draft', 'Published', 'Reserved', 'Completed', 'Expired')`);
        await queryRunner.query(`ALTER TABLE "donations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "donations" ALTER COLUMN "status" TYPE "public"."donations_status_enum_old" USING "status"::"text"::"public"."donations_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "donations" ALTER COLUMN "status" SET DEFAULT 'Draft'`);
        await queryRunner.query(`DROP TYPE "public"."donations_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."donations_status_enum_old" RENAME TO "donations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "rejectionReason"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "rejectedById"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "rejectedAt"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "approvedById"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "approvedAt"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "isVerified" TO "isMailVerified"`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "CHK_reservations_quantity_positive" CHECK ((quantity > 0))`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_donation_likes_donation_id" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_donation_likes_user_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
