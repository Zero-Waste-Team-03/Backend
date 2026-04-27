import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReputationIncreaseOnCategory1777303493459 implements MigrationInterface {
    name = 'AddReputationIncreaseOnCategory1777303493459'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_donation_likes_user_id"`);
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_donation_likes_donation_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "CHK_reservations_quantity_positive"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "reputationGain" integer NOT NULL DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_11aa166fb93661ed2a00a4cc548" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_d03591ec287235baa8139d1537a" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_d03591ec287235baa8139d1537a"`);
        await queryRunner.query(`ALTER TABLE "donation_likes" DROP CONSTRAINT "FK_11aa166fb93661ed2a00a4cc548"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "reputationGain"`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "CHK_reservations_quantity_positive" CHECK ((quantity > 0))`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_donation_likes_donation_id" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donation_likes" ADD CONSTRAINT "FK_donation_likes_user_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
