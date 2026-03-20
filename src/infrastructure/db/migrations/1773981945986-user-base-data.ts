import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserBaseData1773981945986 implements MigrationInterface {
  name = 'UserBaseData1773981945986';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" uuid NOT NULL, "latitude" double precision, "longitude" double precision, "neighborhood" character varying, "city" character varying, "country" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."attachments_uploadstatus_enum" AS ENUM('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "attachments" ("id" uuid NOT NULL, "fileName" character varying NOT NULL, "fileType" character varying NOT NULL, "fileSize" integer NOT NULL, "url" character varying, "uploadedById" uuid NOT NULL, "uploadStatus" "public"."attachments_uploadstatus_enum" NOT NULL DEFAULT 'PENDING', "jobId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('User', 'Local Authority', 'Organizations', 'Stores', 'Administrator')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "displayName" character varying, "description" text, "role" "public"."users_role_enum" NOT NULL DEFAULT 'User', "reputationScore" integer NOT NULL DEFAULT '0', "isMailVerified" boolean NOT NULL DEFAULT false, "locationId" uuid NOT NULL, "avatarAttachmentId" uuid, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachments" ADD CONSTRAINT "FK_a436b9dc8304f58060e905eb705" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_49acb911ee20b02f86ec532a122" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb" FOREIGN KEY ("avatarAttachmentId") REFERENCES "attachments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a07389486cc4f2c5dd51f5333fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_49acb911ee20b02f86ec532a122"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachments" DROP CONSTRAINT "FK_a436b9dc8304f58060e905eb705"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "attachments"`);
    await queryRunner.query(
      `DROP TYPE "public"."attachments_uploadstatus_enum"`,
    );
    await queryRunner.query(`DROP TABLE "locations"`);
  }
}
