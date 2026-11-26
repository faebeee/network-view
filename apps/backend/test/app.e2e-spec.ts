import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Network discovery API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));
    await app.init();
  });

  it('GET /api/network-discovery/interfaces lists IPv4 interfaces', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/network-discovery/interfaces')
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('POST /api/network-discovery/scans validates the range', async () => {
    await request(app.getHttpServer())
      .post('/api/network-discovery/scans')
      .send({ cidr: 'not-a-range' })
      .expect(400);
  });

  it('GET /api/network-discovery/scans/:id returns 404 for unknown scans', async () => {
    await request(app.getHttpServer()).get('/api/network-discovery/scans/unknown').expect(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
