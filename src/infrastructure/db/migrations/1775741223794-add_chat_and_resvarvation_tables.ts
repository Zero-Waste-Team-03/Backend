import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatAndResvarvationTables1775741223794 implements MigrationInterface {
  name = 'AddChatAndResvarvationTables1775741223794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_status_enum" AS ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" uuid NOT NULL, "donationId" uuid NOT NULL, "beneficiaryId" uuid NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'Pending', "confirmedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_one_active_reservation_per_donation" ON "reservations" ("donationId") WHERE "status" IN ('Pending', 'Confirmed')`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_status" ON "reservations" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_beneficiary_id" ON "reservations" ("beneficiaryId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_donation_id" ON "reservations" ("donationId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_status_enum" AS ENUM('Locked', 'Active', 'Archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL, "reservationId" uuid NOT NULL, "lastMessage" character varying, "status" "public"."conversations_status_enum" NOT NULL DEFAULT 'Locked', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_92c3b345c02b47150dd6986c5d" UNIQUE ("reservationId"), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversations_reservation_id" ON "conversations" ("reservationId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL, "conversationId" uuid NOT NULL, "senderId" uuid NOT NULL, "content" text NOT NULL, "isModerated" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_created_at" ON "messages" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_sender_id" ON "messages" ("senderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conversation_id" ON "messages" ("conversationId") `,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('Message', 'Chat_message', 'New_post', 'Test', 'New_achievement', 'Reservation_alert')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_36bf36c34812a0377b9e3dd1116" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_3768a0b3dca8b46fb002dd50bf3" FOREIGN KEY ("beneficiaryId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_92c3b345c02b47150dd6986c5d7" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_92c3b345c02b47150dd6986c5d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_3768a0b3dca8b46fb002dd50bf3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_36bf36c34812a0377b9e3dd1116"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('Message', 'New_post', 'Test', 'New_achievement', 'Reservation_alert')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_messages_conversation_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_sender_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_created_at"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversations_reservation_id"`,
    );
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TYPE "public"."conversations_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservations_donation_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservations_beneficiary_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_reservations_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_one_active_reservation_per_donation"`,
    );
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
  }
}
