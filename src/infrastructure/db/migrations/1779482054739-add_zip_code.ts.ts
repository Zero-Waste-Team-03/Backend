import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZipCode1779482054739 implements MigrationInterface {
  name = 'AddZipCode1779482054739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."categories_sensitivity_enum" AS ENUM('Low', 'Medium', 'High')`,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL, "name" character varying NOT NULL, "sensitivity" "public"."categories_sensitivity_enum" NOT NULL DEFAULT 'Low', "reputationGain" integer NOT NULL DEFAULT '10', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "donation_photos" ("donationId" uuid NOT NULL, "attachmentId" uuid NOT NULL, "isMain" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_46f78149b2d790c6b74c3976bba" PRIMARY KEY ("donationId", "attachmentId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_donation_photos_main_per_donation" ON "donation_photos" ("donationId") WHERE "isMain" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_photos_donation_id" ON "donation_photos" ("donationId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."donations_urgency_enum" AS ENUM('Low', 'Medium', 'High')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."donations_status_enum" AS ENUM('Draft', 'PendingApproval', 'Published', 'Reserved', 'Completed', 'Expired', 'Rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "donations" ("id" uuid NOT NULL, "userId" uuid NOT NULL, "categoryId" uuid NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "quantity" integer NOT NULL, "foodWeightKg" double precision NOT NULL, "specification" jsonb NOT NULL DEFAULT '{}', "expiryDate" TIMESTAMP NOT NULL, "urgency" "public"."donations_urgency_enum" NOT NULL DEFAULT 'Medium', "safetyChecklistCompleted" boolean NOT NULL DEFAULT false, "locationId" uuid, "publishedAt" TIMESTAMP, "approvedAt" TIMESTAMP, "approvedById" uuid, "rejectedAt" TIMESTAMP, "rejectedById" uuid, "rejectionReason" text, "listingExpiresAt" TIMESTAMP, "status" "public"."donations_status_enum" NOT NULL DEFAULT 'Draft', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c01355d6f6f50fc6d1b4a946abf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_listing_expires_at" ON "donations" ("listingExpiresAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_location_id" ON "donations" ("locationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_id_user_id" ON "donations" ("id", "userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_expiry_date" ON "donations" ("expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_status" ON "donations" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_user_id" ON "donations" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_status_enum" AS ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" uuid NOT NULL, "donationId" uuid NOT NULL, "beneficiaryId" uuid NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'Pending', "quantity" integer NOT NULL DEFAULT '1', "confirmedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_one_active_reservation_per_donation_beneficiary" ON "reservations" ("donationId", "beneficiaryId") WHERE "status" IN ('Pending', 'Confirmed')`,
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
      `CREATE TYPE "public"."reports_targettype_enum" AS ENUM('User', 'Message', 'Donation')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('Open', 'Under Review', 'Resolved', 'Rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid NOT NULL, "targetType" "public"."reports_targettype_enum" NOT NULL, "targetId" uuid NOT NULL, "reporterId" uuid NOT NULL, "reason" character varying(120) NOT NULL, "description" text, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'Open', "reviewedById" uuid, "reviewedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_created_at" ON "reports" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_status" ON "reports" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_reporter_id" ON "reports" ("reporterId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_target" ON "reports" ("targetType", "targetId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reputation_logs_source_enum" AS ENUM('DONATION_COMPLETED', 'PICKUP_COMPLETED', 'MANUAL_ADJUSTMENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reputation_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "pointsGained" integer NOT NULL, "source" "public"."reputation_logs_source_enum" NOT NULL DEFAULT 'DONATION_COMPLETED', "referenceId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3074487f403eca164639d4f99d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "achievements" ("id" uuid NOT NULL, "userId" uuid NOT NULL, "badgeId" uuid NOT NULL, "awardedAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_achievements_user_badge" ON "achievements" ("userId", "badgeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "badges" ("id" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" text NOT NULL, "iconAttachmentId" uuid, "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8a651318b8de577e8e217676466" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_badges_code" ON "badges" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "donation_likes" ("userId" uuid NOT NULL, "donationId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8a411021cc96ca7165a1fd0415b" PRIMARY KEY ("userId", "donationId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_likes_donation_id" ON "donation_likes" ("donationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_likes_user_created_at" ON "donation_likes" ("userId", "createdAt") `,
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
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isMailVerified"`);
    await queryRunner.query(
      `ALTER TABLE "locations" ADD "zipCode" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD "deviceId" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD "isPushNotificationsEnabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phoneNumber" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isVerified" boolean NOT NULL DEFAULT false`,
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
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "UQ_8fc1530188edc052889333b92a6"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tokens_userId_deviceId" ON "tokens" ("userId", "deviceId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb" FOREIGN KEY ("avatarAttachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_photos" ADD CONSTRAINT "FK_008e2c57b31289c7404420d6eae" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_photos" ADD CONSTRAINT "FK_a45b12fb43866171028eafd0812" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_cfd5edc39019b9001bd86e90f77" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_334c9a38d141068afb8c9fa72d7" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_6c3c8e04d27520f842a8052bce9" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_7077ec6121d0a9e056bab9a68b8" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_7dba28c33d8874fbba4c9f7751e" FOREIGN KEY ("rejectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_36bf36c34812a0377b9e3dd1116" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_3768a0b3dca8b46fb002dd50bf3" FOREIGN KEY ("beneficiaryId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_4353be8309ce86650def2f8572d" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_26b00552a46acf717aa502b1596" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reputation_logs" ADD CONSTRAINT "FK_c1f8a4d0c52c2562ab4c973affd" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD CONSTRAINT "FK_a4c9761e826d07a1f4c51ca1d2b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD CONSTRAINT "FK_75e5dd5e08a7ae1f1b24332ef12" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ADD CONSTRAINT "FK_5358b17730a20dd2761de099599" FOREIGN KEY ("iconAttachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_11aa166fb93661ed2a00a4cc548" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_d03591ec287235baa8139d1537a" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
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
      `ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_d03591ec287235baa8139d1537a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_11aa166fb93661ed2a00a4cc548"`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" DROP CONSTRAINT "FK_5358b17730a20dd2761de099599"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP CONSTRAINT "FK_75e5dd5e08a7ae1f1b24332ef12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP CONSTRAINT "FK_a4c9761e826d07a1f4c51ca1d2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reputation_logs" DROP CONSTRAINT "FK_c1f8a4d0c52c2562ab4c973affd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_26b00552a46acf717aa502b1596"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_4353be8309ce86650def2f8572d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_3768a0b3dca8b46fb002dd50bf3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_36bf36c34812a0377b9e3dd1116"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_7dba28c33d8874fbba4c9f7751e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_7077ec6121d0a9e056bab9a68b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_6c3c8e04d27520f842a8052bce9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_334c9a38d141068afb8c9fa72d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_cfd5edc39019b9001bd86e90f77"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_photos" DROP CONSTRAINT "FK_a45b12fb43866171028eafd0812"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_photos" DROP CONSTRAINT "FK_008e2c57b31289c7404420d6eae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_tokens_userId_deviceId"`);
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "UQ_8fc1530188edc052889333b92a6" UNIQUE ("fcmToken")`,
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
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isVerified"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phoneNumber"`);
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN "isPushNotificationsEnabled"`,
    );
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "deviceId"`);
    await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN "zipCode"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isMailVerified" boolean NOT NULL DEFAULT false`,
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
      `DROP INDEX "public"."IDX_donation_likes_user_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_donation_likes_donation_id"`,
    );
    await queryRunner.query(`DROP TABLE "donation_likes"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_badges_code"`);
    await queryRunner.query(`DROP TABLE "badges"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_achievements_user_badge"`);
    await queryRunner.query(`DROP TABLE "achievements"`);
    await queryRunner.query(`DROP TABLE "reputation_logs"`);
    await queryRunner.query(`DROP TYPE "public"."reputation_logs_source_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reports_target"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reports_reporter_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reports_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reports_created_at"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_targettype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservations_donation_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservations_beneficiary_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_reservations_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_one_active_reservation_per_donation_beneficiary"`,
    );
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_expiry_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_id_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_location_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_donations_listing_expires_at"`,
    );
    await queryRunner.query(`DROP TABLE "donations"`);
    await queryRunner.query(`DROP TYPE "public"."donations_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."donations_urgency_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_donation_photos_donation_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_donation_photos_main_per_donation"`,
    );
    await queryRunner.query(`DROP TABLE "donation_photos"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TYPE "public"."categories_sensitivity_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb" FOREIGN KEY ("avatarAttachmentId") REFERENCES "attachments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
