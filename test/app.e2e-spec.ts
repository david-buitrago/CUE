import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import type { Meeting } from './../src/meetings/meeting';
import type { TranscriptSegment } from './../src/transcripts/transcript-segment';

describe('CUE API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    const dataSource = app.get(DataSource);
    await dataSource.query('TRUNCATE TABLE meetings');
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      service: 'cue-engine',
    });
  });

  it('/meetings (POST) creates an active meeting', async () => {
    await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion' })
      .expect(201)
      .expect(({ body }) => {
        const meeting = body as Meeting;

        expect(meeting).toEqual(
          expect.objectContaining({
            title: 'Architecture discussion',
            status: 'active',
          }),
        );
        expect(meeting.id).toEqual(expect.any(String));
        expect(meeting.startedAt).toEqual(expect.any(String));
      });
  });

  it('/meetings (POST) rejects an empty title', () => {
    return request(app.getHttpServer())
      .post('/meetings')
      .send({ title: '' })
      .expect(400)
      .expect({
        message: ['title should not be empty'],
        error: 'Bad Request',
        statusCode: 400,
      });
  });

  it('/meetings (POST) rejects unexpected properties', () => {
    return request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion', unexpected: true })
      .expect(400)
      .expect({
        message: ['property unexpected should not exist'],
        error: 'Bad Request',
        statusCode: 400,
      });
  });

  it('/meetings (GET) returns meetings created during the same session', async () => {
    await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/meetings')
      .expect(200)
      .expect(({ body }) => {
        const meetings = body as Meeting[];

        expect(meetings).toEqual([
          expect.objectContaining({
            title: 'Architecture discussion',
            status: 'active',
          }),
        ]);
      });
  });

  it('/meetings/:id/end (PATCH) ends an active meeting', async () => {
    const response = await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion' })
      .expect(201);

    const createdMeeting = response.body as Meeting;

    await request(app.getHttpServer())
      .patch(`/meetings/${createdMeeting.id}/end`)
      .expect(200)
      .expect(({ body }) => {
        const endedMeeting = body as Meeting;

        expect(endedMeeting).toEqual(
          expect.objectContaining({
            id: createdMeeting.id,
            status: 'ended',
          }),
        );
        expect(endedMeeting.endedAt).toEqual(expect.any(String));
      });
  });

  it('/meetings/:id/end (PATCH) returns 404 for an unknown meeting', () => {
    return request(app.getHttpServer())
      .patch('/meetings/missing-meeting/end')
      .expect(404)
      .expect({
        message: 'Meeting with id missing-meeting was not found',
        error: 'Not Found',
        statusCode: 404,
      });
  });

  it('creates and lists transcript segments for a meeting', async () => {
    const meetingResponse = await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion' })
      .expect(201);

    const meeting = meetingResponse.body as Meeting;

    const segmentResponse = await request(app.getHttpServer())
      .post(`/meetings/${meeting.id}/transcript-segments`)
      .send({
        speaker: 'David',
        text: 'Let us review the architecture.',
      })
      .expect(201);

    const segment = segmentResponse.body as TranscriptSegment;

    expect(segment).toEqual(
      expect.objectContaining({
        meetingId: meeting.id,
        speaker: 'David',
        text: 'Let us review the architecture.',
      }),
    );
    expect(segment.id).toEqual(expect.any(String));
    expect(segment.capturedAt).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get(`/meetings/${meeting.id}/transcript-segments`)
      .expect(200)
      .expect(({ body }) => {
        const segments = body as TranscriptSegment[];

        expect(segments).toEqual([
          expect.objectContaining({
            id: segment.id,
            meetingId: meeting.id,
            speaker: 'David',
            text: 'Let us review the architecture.',
          }),
        ]);
      });
  });

  it('rejects transcript segments for an unknown meeting', () => {
    return request(app.getHttpServer())
      .post('/meetings/missing-meeting/transcript-segments')
      .send({
        speaker: 'David',
        text: 'Let us review the architecture.',
      })
      .expect(404)
      .expect({
        message: 'Meeting with id missing-meeting was not found',
        error: 'Not Found',
        statusCode: 404,
      });
  });

  it('rejects transcript segments for an ended meeting', async () => {
    const meetingResponse = await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion' })
      .expect(201);

    const meeting = meetingResponse.body as Meeting;

    await request(app.getHttpServer())
      .patch(`/meetings/${meeting.id}/end`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/meetings/${meeting.id}/transcript-segments`)
      .send({
        speaker: 'David',
        text: 'Let us review the architecture.',
      })
      .expect(409)
      .expect({
        message: 'Cannot add transcript segments to an ended meeting',
        error: 'Conflict',
        statusCode: 409,
      });
  });

  it('adds a deterministic transcript simulation to an active meeting', async () => {
    const meetingResponse = await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion' })
      .expect(201);

    const meeting = meetingResponse.body as Meeting;

    await request(app.getHttpServer())
      .post(`/meetings/${meeting.id}/transcript-simulation`)
      .expect(201)
      .expect(({ body }) => {
        const segments = body as TranscriptSegment[];

        expect(segments).toHaveLength(3);
        expect(segments.map((segment) => segment.speaker)).toEqual([
          'David',
          'Alex',
          'David',
        ]);
      });

    await request(app.getHttpServer())
      .get(`/meetings/${meeting.id}/transcript-segments`)
      .expect(200)
      .expect(({ body }) => {
        const segments = body as TranscriptSegment[];

        expect(segments).toHaveLength(3);
      });
  });

  it('emits a WebSocket event only to the meeting subscribers', async () => {
    await app.listen(0);

    const httpServer = app.getHttpServer() as unknown as Server;
    const address = httpServer.address();

    if (!address || typeof address === 'string') {
      throw new Error('The test server did not expose a TCP address');
    }

    const firstMeetingResponse = await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Architecture discussion' })
      .expect(201);

    const firstMeeting = firstMeetingResponse.body as Meeting;

    const secondMeetingResponse = await request(app.getHttpServer())
      .post('/meetings')
      .send({ title: 'Product discussion' })
      .expect(201);

    const secondMeeting = secondMeetingResponse.body as Meeting;

    await new Promise<void>((resolve, reject) => {
      const firstMeetingSocket = io(`http://127.0.0.1:${address.port}/live`, {
        transports: ['websocket'],
      });
      const secondMeetingSocket = io(`http://127.0.0.1:${address.port}/live`, {
        transports: ['websocket'],
      });
      const sockets: Socket[] = [firstMeetingSocket, secondMeetingSocket];

      const timeout = setTimeout(() => {
        sockets.forEach((socket) => socket.close());
        reject(new Error('Timed out waiting for the transcript event'));
      }, 2_000);

      const fail = (error: Error) => {
        clearTimeout(timeout);
        sockets.forEach((socket) => socket.close());
        reject(error);
      };

      let subscriptionCount = 0;
      const createSegmentWhenBothAreSubscribed = () => {
        subscriptionCount += 1;

        if (subscriptionCount === 2) {
          void request(app.getHttpServer())
            .post(`/meetings/${firstMeeting.id}/transcript-segments`)
            .send({
              speaker: 'David',
              text: 'Let us review the architecture.',
            })
            .expect(201)
            .catch(fail);
        }
      };

      sockets.forEach((socket) => socket.on('connect_error', fail));

      firstMeetingSocket.on('connect', () => {
        firstMeetingSocket.emit('transcript.subscribe', {
          meetingId: firstMeeting.id,
        });
      });

      secondMeetingSocket.on('connect', () => {
        secondMeetingSocket.emit('transcript.subscribe', {
          meetingId: secondMeeting.id,
        });
      });

      firstMeetingSocket.on('transcript.subscribed', (value: unknown) => {
        expect(value).toEqual({ meetingId: firstMeeting.id });
        createSegmentWhenBothAreSubscribed();
      });

      secondMeetingSocket.on('transcript.subscribed', (value: unknown) => {
        expect(value).toEqual({ meetingId: secondMeeting.id });
        createSegmentWhenBothAreSubscribed();
      });

      firstMeetingSocket.on('transcript.segment.created', (value: unknown) => {
        const segment = value as TranscriptSegment;

        clearTimeout(timeout);
        sockets.forEach((socket) => socket.close());

        expect(segment).toEqual(
          expect.objectContaining({
            meetingId: firstMeeting.id,
            speaker: 'David',
            text: 'Let us review the architecture.',
          }),
        );

        resolve();
      });

      secondMeetingSocket.on('transcript.segment.created', () => {
        fail(
          new Error(
            'A subscriber received a transcript event for another meeting',
          ),
        );
      });
    });
  });
});
