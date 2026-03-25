import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { UploadService } from 'src/common/modules/upload/upload.service';
import { AccessTokenGuard } from 'src/core/authentication/guards/access-token.guard';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import cloudinaryConfig from 'src/config/cloud.config';
import { UploadController } from 'src/common/modules/upload/upload.controller';

describe('UploadController (e2e)', () => {
  let app: INestApplication;

  const mockUploadService = {
    uploadFile: jest.fn(),
    uploadFiles: jest.fn(),
    deleteFile: jest.fn(),
    deleteFiles: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest<{ user: { id: string } }>();
      req.user = { id: 'test-user-id' };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              [authConfig.KEY]: {
                jwt: {
                  accessTokenSecret: 'secret',
                  accessTokenExpiresIn: '1h',
                },
              },
              [cloudinaryConfig.KEY]: {
                cloudName: 'test-cloud',
                apiKey: 'test-key',
                apiSecret: 'test-secret',
              },
            }),
          ],
        }),
      ],
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
        {
          provide: getQueueToken(QUEUE_NAME.UPLOAD),
          useValue: mockQueue,
        },
        {
          provide: authConfig.KEY,
          useValue: {
            jwt: {
              accessTokenSecret: 'secret',
              accessTokenExpiresIn: '1h',
            },
          },
        },
        {
          provide: cloudinaryConfig.KEY,
          useValue: {
            cloudName: 'test-cloud',
            apiKey: 'test-key',
            apiSecret: 'test-secret',
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /upload/file', () => {
    it('should upload a single file', async () => {
      mockUploadService.uploadFile.mockResolvedValue({
        attachmentId: '1',
        jobId: 1,
      });

      return request(app.getHttpServer())
        .post('/upload/file')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(201)
        .expect(() => {
          expect(mockUploadService.uploadFile).toHaveBeenCalledWith(
            expect.any(Object),
            'test-user-id',
            undefined,
          );
        });
    });

    it('should upload a single file with uploadType', async () => {
      mockUploadService.uploadFile.mockResolvedValue({
        attachmentId: '1',
        jobId: 'job1',
      });

      return request(app.getHttpServer())
        .post('/upload/file')
        .query({ uploadType: 'USER_PROFILE' })
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(201)
        .expect(() => {
          expect(mockUploadService.uploadFile).toHaveBeenCalledWith(
            expect.any(Object),
            'test-user-id',
            { uploadType: 'USER_PROFILE' },
          );
        });
    });
    it('should upload multiple files', async () => {
      mockUploadService.uploadFiles.mockResolvedValue({
        attachmentIds: ['1', '2'],
        jobId: 'job1',
      });

      return request(app.getHttpServer())
        .post('/upload/files')
        .attach('files', Buffer.from('test content1'), 'test1.txt')
        .attach('files', Buffer.from('test content2'), 'test2.txt')
        .expect(201)
        .expect(() => {
          expect(mockUploadService.uploadFiles).toHaveBeenCalledWith(
            expect.arrayContaining([expect.any(Object)]),
            'test-user-id',
            undefined,
          );
        });
    });
  });

  describe('DELETE /upload/:id', () => {
    it('should delete a file', async () => {
      mockUploadService.deleteFile.mockResolvedValue({ success: true });

      return request(app.getHttpServer())
        .delete('/upload/550e8400-e29b-41d4-a716-446655440000')
        .expect(200)
        .expect(() => {
          expect(mockUploadService.deleteFile).toHaveBeenCalledWith(
            '550e8400-e29b-41d4-a716-446655440000',
            'test-user-id',
          );
        });
    });
  });

  describe('DELETE /upload', () => {
    it('should delete multiple files', async () => {
      mockUploadService.deleteFiles.mockResolvedValue({ success: true });

      return request(app.getHttpServer())
        .delete('/upload')
        .send({ ids: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'] })
        .expect(200)
        .expect(() => {
          expect(mockUploadService.deleteFiles).toHaveBeenCalledWith(
            ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
            'test-user-id',
          );
        });
    });
  });
});
