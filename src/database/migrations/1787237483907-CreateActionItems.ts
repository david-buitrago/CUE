import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActionItems1787237483907 implements MigrationInterface {
  name = 'CreateActionItems1787237483907';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."action_item_status" AS ENUM('open', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "action_items" ("id" uuid NOT NULL, "meetingId" uuid NOT NULL, "sourceSegmentId" uuid NOT NULL, "description" character varying(500) NOT NULL, "status" "public"."action_item_status" NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_5a84b168b001636b379312104ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_action_items_source_segment_id" ON "action_items"  ("sourceSegmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_action_items_meeting_id" ON "action_items"  ("meetingId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "action_items" ADD CONSTRAINT "FK_a302ef11e140ef94e5ccb1c1872" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_items" ADD CONSTRAINT "FK_70ccd24148eea91e4d53f91c90c" FOREIGN KEY ("sourceSegmentId") REFERENCES "transcript_segments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "action_items" DROP CONSTRAINT "FK_70ccd24148eea91e4d53f91c90c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_items" DROP CONSTRAINT "FK_a302ef11e140ef94e5ccb1c1872"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_action_items_meeting_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_action_items_source_segment_id"`,
    );
    await queryRunner.query(`DROP TABLE "action_items"`);
    await queryRunner.query(`DROP TYPE "public"."action_item_status"`);
  }
}
