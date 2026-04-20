import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReservationQuantityAndDonationQuantityTrigger1776300000000 implements MigrationInterface {
  name = 'AddReservationQuantityAndDonationQuantityTrigger1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "reservations" ADD "quantity" integer NOT NULL DEFAULT 1',
    );
    await queryRunner.query(
      'ALTER TABLE "reservations" ADD CONSTRAINT "CHK_reservations_quantity_positive" CHECK ("quantity" > 0)',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."UQ_one_active_reservation_per_donation"',
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_one_active_reservation_per_donation_beneficiary" ON "reservations" ("donationId", "beneficiaryId") WHERE "status" IN ('Pending', 'Confirmed')`,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "TRG_donations_enforce_quantity_status" ON "donations"',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS enforce_donation_quantity_status',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."UQ_one_active_reservation_per_donation_beneficiary"',
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_one_active_reservation_per_donation" ON "reservations" ("donationId") WHERE "status" IN ('Pending', 'Confirmed')`,
    );

    await queryRunner.query(
      'ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "CHK_reservations_quantity_positive"',
    );
    await queryRunner.query(
      'ALTER TABLE "reservations" DROP COLUMN "quantity"',
    );
  }
}
