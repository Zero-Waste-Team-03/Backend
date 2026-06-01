import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReservationExpiredStatusAndUpdateTrigger1780322892000
  implements MigrationInterface
{
  name =
    'AddReservationExpiredStatusAndUpdateTrigger1780322892000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."reservations_status_enum" ADD VALUE 'Expired'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'Reservation_expired'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'Reservation_cancelled'`,
    );

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_donations_enforce_quantity_status" ON "donations"`,
    );

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "enforce_donation_quantity_status"`,
    );

    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION enforce_donation_quantity_status()
       RETURNS trigger AS $$
       BEGIN
         IF NEW."quantity" < 0 THEN
           RAISE EXCEPTION 'Donation quantity cannot be negative';
         END IF;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,
    );

    await queryRunner.query(
      `CREATE TRIGGER "TRG_donations_enforce_quantity_status"
       BEFORE INSERT OR UPDATE OF "quantity", "status"
       ON "donations"
       FOR EACH ROW
       EXECUTE FUNCTION enforce_donation_quantity_status()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_donations_enforce_quantity_status" ON "donations"`,
    );

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "enforce_donation_quantity_status"`,
    );

    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION enforce_donation_quantity_status()
       RETURNS trigger AS $$
       BEGIN
         IF NEW."quantity" < 0 THEN
           RAISE EXCEPTION 'Donation quantity cannot be negative';
         END IF;

         IF NEW."quantity" <= 0 THEN
           NEW."status" := 'Completed';
         END IF;

         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,
    );

    await queryRunner.query(
      `CREATE TRIGGER "TRG_donations_enforce_quantity_status"
       BEFORE INSERT OR UPDATE OF "quantity", "status"
       ON "donations"
       FOR EACH ROW
       EXECUTE FUNCTION enforce_donation_quantity_status()`,
    );

    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" = 'Reservation_expired'`,
    );
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" = 'Reservation_cancelled'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('Message', 'Chat_message', 'New_post', 'Test', 'New_achievement', 'Reservation_alert', 'Report_alert', 'Account_status_alert')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notifications_type_enum_old"`,
    );

    await queryRunner.query(
      `DELETE FROM "reservations" WHERE "status" = 'Expired'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."reservations_status_enum" RENAME TO "reservations_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_status_enum" AS ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ALTER COLUMN "status" TYPE "public"."reservations_status_enum" USING "status"::"text"::"public"."reservations_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."reservations_status_enum_old"`,
    );
  }
}