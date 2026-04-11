import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReportTable1775820004926 implements MigrationInterface {
    name = 'AddReportTable1775820004926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."reports_targettype_enum" AS ENUM('User', 'Message', 'Donation')`);
        await queryRunner.query(`CREATE TYPE "public"."reports_status_enum" AS ENUM('Open', 'Under Review', 'Resolved', 'Rejected')`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" uuid NOT NULL, "targetType" "public"."reports_targettype_enum" NOT NULL, "targetId" uuid NOT NULL, "reporterId" uuid NOT NULL, "reason" character varying(120) NOT NULL, "description" text, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'Open', "reviewedById" uuid, "reviewedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_reports_created_at" ON "reports" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_reports_status" ON "reports" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_reports_reporter_id" ON "reports" ("reporterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_reports_target" ON "reports" ("targetType", "targetId") `);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_4353be8309ce86650def2f8572d" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_26b00552a46acf717aa502b1596" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_26b00552a46acf717aa502b1596"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_4353be8309ce86650def2f8572d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reports_target"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reports_reporter_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reports_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reports_created_at"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reports_targettype_enum"`);
    }

}
