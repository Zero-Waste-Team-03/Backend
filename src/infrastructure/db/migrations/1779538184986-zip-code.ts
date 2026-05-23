import { MigrationInterface, QueryRunner } from "typeorm";

export class ZipCode1779538184986 implements MigrationInterface {
    name = 'ZipCode1779538184986'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "locations" RENAME COLUMN "zip" TO "zipCode"`);
        await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN "zipCode"`);
        await queryRunner.query(`ALTER TABLE "locations" ADD "zipCode" character varying(20)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN "zipCode"`);
        await queryRunner.query(`ALTER TABLE "locations" ADD "zipCode" character varying`);
        await queryRunner.query(`ALTER TABLE "locations" RENAME COLUMN "zipCode" TO "zip"`);
    }

}
