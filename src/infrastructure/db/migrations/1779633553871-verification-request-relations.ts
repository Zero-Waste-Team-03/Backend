import { MigrationInterface, QueryRunner } from "typeorm";

export class VerificationRequestRelations1779633553871 implements MigrationInterface {
    name = 'VerificationRequestRelations1779633553871'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."verification_requests_status_enum" AS ENUM('Pending', 'Approved', 'Rejected')`);
        await queryRunner.query(`CREATE TABLE "verification_requests" ("id" uuid NOT NULL, "requesterId" uuid NOT NULL, "targetFoodSaverId" uuid NOT NULL, "status" "public"."verification_requests_status_enum" NOT NULL DEFAULT 'Pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c5d405ea25e8abd5b0b096a4f6f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "verification_requests" ADD CONSTRAINT "FK_e395c793fc54bade904cd28b3cd" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "verification_requests" ADD CONSTRAINT "FK_10bb3a7947fcb4a01df8695099b" FOREIGN KEY ("targetFoodSaverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_requests" DROP CONSTRAINT "FK_10bb3a7947fcb4a01df8695099b"`);
        await queryRunner.query(`ALTER TABLE "verification_requests" DROP CONSTRAINT "FK_e395c793fc54bade904cd28b3cd"`);
        await queryRunner.query(`DROP TABLE "verification_requests"`);
        await queryRunner.query(`DROP TYPE "public"."verification_requests_status_enum"`);
    }

}
