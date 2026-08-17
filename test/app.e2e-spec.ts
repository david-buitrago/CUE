import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
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
        expect(body).toEqual(
          expect.objectContaining({
            title: 'Architecture discussion',
            status: 'active',
          }),
        );
        expect(body.id).toEqual(expect.any(String));
        expect(body.startedAt).toEqual(expect.any(String));
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
        expect(body).toEqual([
          expect.objectContaining({
            title: 'Architecture discussion',
            status: 'active',
          }),
        ]);
      });
  });
});