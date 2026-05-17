import { MigrationInterface, QueryRunner } from "typeorm";

export class Leaderboard1779051103006 implements MigrationInterface {
    name = 'Leaderboard1779051103006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "UQ_tokens_userId_deviceId"`);
        await queryRunner.query(`CREATE TYPE "public"."reputation_logs_source_enum" AS ENUM('DONATION_COMPLETED', 'PICKUP_COMPLETED', 'MANUAL_ADJUSTMENT')`);
        await queryRunner.query(`CREATE TABLE "reputation_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "pointsGained" integer NOT NULL, "source" "public"."reputation_logs_source_enum" NOT NULL DEFAULT 'DONATION_COMPLETED', "referenceId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3074487f403eca164639d4f99d8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "UQ_8fc1530188edc052889333b92a6"`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "deviceId" SET NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tokens_userId_deviceId" ON "tokens" ("userId", "deviceId") `);
        await queryRunner.query(`ALTER TABLE "reputation_logs" ADD CONSTRAINT "FK_c1f8a4d0c52c2562ab4c973affd" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reputation_logs" DROP CONSTRAINT "FK_c1f8a4d0c52c2562ab4c973affd"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_tokens_userId_deviceId"`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "deviceId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD CONSTRAINT "UQ_8fc1530188edc052889333b92a6" UNIQUE ("fcmToken")`);
        await queryRunner.query(`DROP TABLE "reputation_logs"`);
        await queryRunner.query(`DROP TYPE "public"."reputation_logs_source_enum"`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD CONSTRAINT "UQ_tokens_userId_deviceId" UNIQUE ("userId", "deviceId")`);
    }

}
