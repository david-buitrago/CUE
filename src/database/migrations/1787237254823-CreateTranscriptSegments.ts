import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTranscriptSegments1787237254823 implements MigrationInterface {
  name = 'CreateTranscriptSegments1787237254823';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transcript_segments" ("id" uuid NOT NULL, "meetingId" uuid NOT NULL, "speaker" character varying(80) NOT NULL, "text" text NOT NULL, "capturedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_34cfd4b54a9857af7dfa443f3ed" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transcript_segments_meeting_id" ON "transcript_segments"  ("meetingId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "transcript_segments" ADD CONSTRAINT "FK_9fd95e01d3b7cd6b732f7a7a7ee" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transcript_segments" DROP CONSTRAINT "FK_9fd95e01d3b7cd6b732f7a7a7ee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transcript_segments_meeting_id"`,
    );
    await queryRunner.query(`DROP TABLE "transcript_segments"`);
  }
}
