import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWeightDonation1775913832789 implements MigrationInterface {
    name = 'AddWeightDonation1775913832789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "achievements" ("id" uuid NOT NULL, "userId" uuid NOT NULL, "badgeId" uuid NOT NULL, "awardedAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_achievements_user_badge" ON "achievements" ("userId", "badgeId") `);
        await queryRunner.query(`CREATE TABLE "badges" ("id" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" text NOT NULL, "iconAttachmentId" uuid, "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8a651318b8de577e8e217676466" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_badges_code" ON "badges" ("code") `);
        await queryRunner.query(`ALTER TABLE "donations" ADD "foodWeightKg" double precision`);
        await queryRunner.query(`ALTER TABLE "achievements" ADD CONSTRAINT "FK_a4c9761e826d07a1f4c51ca1d2b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "achievements" ADD CONSTRAINT "FK_75e5dd5e08a7ae1f1b24332ef12" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "badges" ADD CONSTRAINT "FK_5358b17730a20dd2761de099599" FOREIGN KEY ("iconAttachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "badges" DROP CONSTRAINT "FK_5358b17730a20dd2761de099599"`);
        await queryRunner.query(`ALTER TABLE "achievements" DROP CONSTRAINT "FK_75e5dd5e08a7ae1f1b24332ef12"`);
        await queryRunner.query(`ALTER TABLE "achievements" DROP CONSTRAINT "FK_a4c9761e826d07a1f4c51ca1d2b"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "foodWeightKg"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_badges_code"`);
        await queryRunner.query(`DROP TABLE "badges"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_achievements_user_badge"`);
        await queryRunner.query(`DROP TABLE "achievements"`);
    }

}
