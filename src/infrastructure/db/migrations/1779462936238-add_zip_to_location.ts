import { MigrationInterface, QueryRunner } from "typeorm";

export class AddZipToLocation1779462936238 implements MigrationInterface {
    name = 'AddZipToLocation1779462936238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "locations" ADD "zip" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN "zip"`);
    }

}
