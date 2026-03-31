import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ErrorsModule } from 'src/common/errors/errors.module';
import { ERROR_CODES } from 'src/common/errors/error-codes';

describe('Errors Contract Endpoint (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ErrorsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/errors should return the full error catalog', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/errors')
      .expect(200);

    const body = response.body as Array<{
      code: string;
      httpStatus: number;
      message: string;
      args: Record<string, string> | null;
    }>;

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(Object.keys(ERROR_CODES).length);

    for (const entry of body) {
      expect(entry).toHaveProperty('code');
      expect(entry).toHaveProperty('httpStatus');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('args');
      expect(entry.code).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it('should include known error codes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/errors')
      .expect(200);

    const codes = (response.body as Array<{ code: string }>).map((e) => e.code);
    expect(codes).toContain('auth.invalid_credentials');
    expect(codes).toContain('user.not_found');
    expect(codes).toContain('upload.max_files_exceeded');
  });

  it('should include args schema for codes that have args', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/errors')
      .expect(200);

    const maxFiles = (
      response.body as Array<{
        code: string;
        args: Record<string, string> | null;
      }>
    ).find((e) => e.code === 'upload.max_files_exceeded');

    expect(maxFiles?.args).toEqual({ max: 'number' });
  });
});
