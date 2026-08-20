import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeetings1787236261542 implements MigrationInterface {
  name = 'CreateMeetings1787236261542';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_status" AS ENUM('active', 'ended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "meetings" ("id" uuid NOT NULL, "title" character varying(120) NOT NULL, "status" "public"."meeting_status" NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "meetings"`);
    await queryRunner.query(`DROP TYPE "public"."meeting_status"`);
  }
}
