import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesAndDonations1775150000000 implements MigrationInterface {
  name = 'AddCategoriesAndDonations1775150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."categories_sensitivity_enum" AS ENUM('Low', 'Medium', 'High')`,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL, "name" character varying NOT NULL, "sensitivity" "public"."categories_sensitivity_enum" NOT NULL DEFAULT 'Low', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."donations_status_enum" AS ENUM('Draft', 'Published', 'Reserved', 'Completed', 'Expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "donations" ("id" uuid NOT NULL, "userId" uuid NOT NULL, "categoryId" uuid NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "quantity" integer NOT NULL, "specification" jsonb NOT NULL DEFAULT '{}', "expiryDate" TIMESTAMP NOT NULL, "status" "public"."donations_status_enum" NOT NULL DEFAULT 'Draft', "attachmentId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_73e0f0bd4f1f8996575a2025f5d" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_donations_user_id" ON "donations" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_status" ON "donations" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_expiry_date" ON "donations" ("expiryDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_id_user_id" ON "donations" ("id", "userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_attachment" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_attachment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_id_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_expiry_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_user_id"`);
    await queryRunner.query(`DROP TABLE "donations"`);
    await queryRunner.query(`DROP TYPE "public"."donations_status_enum"`);

    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TYPE "public"."categories_sensitivity_enum"`);
  }
}
