import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationsAndMessages1775300000000 implements MigrationInterface {
  name = 'AddConversationsAndMessages1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_status_enum" AS ENUM('Locked', 'Active', 'Archived')`,
    );

    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL, "reservationId" uuid NOT NULL, "lastMessage" character varying, "status" "public"."conversations_status_enum" NOT NULL DEFAULT 'Locked', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_conversations_reservation_id" UNIQUE ("reservationId"), CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL, "conversationId" uuid NOT NULL, "senderId" uuid NOT NULL, "content" text NOT NULL, "isModerated" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conversation_id" ON "messages" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_sender_id" ON "messages" ("senderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_created_at" ON "messages" ("createdAt") `,
    );

    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_reservation_id" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_conversation_id" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_sender_id" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_sender_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_conversation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_reservation_id"`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_messages_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_sender_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_messages_conversation_id"`,
    );

    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TYPE "public"."conversations_status_enum"`);
  }
}
