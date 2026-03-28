import { INestApplication } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GqlExecutionContext, Query, Resolver } from '@nestjs/graphql';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AuthenticationResolver } from 'src/core/authentication/authentication.resolver';
import { AuthenticationService } from 'src/core/authentication/v1/authentication.service';
import { AccessTokenGuard } from 'src/core/authentication/guards/access-token.guard';
import { ConfigModule } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import cloudinaryConfig from 'src/config/cloud.config';

@Resolver()
class TestQueryResolver {
  @Query(() => String)
  health(): string {
    return 'ok';
  }
}

describe('Authentication GraphQL (e2e)', () => {
  let app: INestApplication<App>;
  const authService = {
    registerUser: jest.fn(),
    sendVerificationCode: jest.fn(),
    changePassword: jest.fn(),
  };
  const accessTokenGuard: CanActivate = {
    canActivate(context: ExecutionContext): boolean {
      const gqlContext = GqlExecutionContext.create(context);
      const requestContext = gqlContext.getContext<{
        req?: { user?: { id: string } };
      }>();
      if (requestContext.req) {
        requestContext.req.user = { id: 'user-123' };
      }
      return true;
    },
  };

  beforeEach(async () => {
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
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          path: '/graphql',
        }),
      ],
      providers: [
        TestQueryResolver,
        AuthenticationResolver,
        { provide: AuthenticationService, useValue: authService },
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
      .useValue(accessTokenGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('sendVerification mutation accepts email', async () => {
    authService.sendVerificationCode.mockResolvedValue({
      message: 'Verification code sent successfully. Please check your email.',
    });

    const query = `
      mutation SendVerification($email: String!) {
        sendVerification(email: $email) {
          message
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: { email: 'user@example.com' },
      })
      .expect(200);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.data.sendVerification.message).toContain(
      'Verification code sent successfully',
    );
    expect(authService.sendVerificationCode).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it('register mutation accepts otp argument and location in input', async () => {
    authService.registerUser.mockResolvedValue({
      message: 'User registered successfully.',
    });

    const query = `
      mutation Register($otp: String!, $registerInput: RegisterInput!) {
        register(otp: $otp, registerInput: $registerInput) {
          message
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: {
          otp: '123456',
          registerInput: {
            displayName: 'John Doe',
            email: 'user@example.com',
            password: 'StrongPass123!',
            location: {
              city: 'Algiers',
              country: 'Algeria',
              latitude: 36.7525,
              longitude: 3.042,
            },
          },
        },
      })
      .expect(200);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.data.register.message).toBe(
      'User registered successfully.',
    );
    expect(authService.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({ city: 'Algiers' }),
      }),
      '123456',
    );
  });

  it('verifyEmail mutation is removed from schema', async () => {
    const query = `
      mutation VerifyEmail($email: String!, $code: String!) {
        verifyEmail(verifyEmailInput: { email: $email, code: $code }) {
          message
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: { email: 'user@example.com', code: '123456' },
      })
      .expect(400);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.errors[0].message).toContain(
      'Cannot query field "verifyEmail" on type "Mutation"',
    );
  });

  it('changePassword mutation accepts current/new password and uses default logoutFromOtherDevices=false', async () => {
    authService.changePassword.mockResolvedValue({
      message: 'Password changed successfully.',
    });

    const query = `
      mutation ChangePassword($changePasswordInput: ChangePasswordInput!) {
        changePassword(changePasswordInput: $changePasswordInput) {
          message
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: {
          changePasswordInput: {
            currentPassword: 'OldPass123!',
            newPassword: 'NewPass123!',
          },
        },
      })
      .expect(200);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.data.changePassword.message).toBe(
      'Password changed successfully.',
    );
    expect(authService.changePassword).toHaveBeenCalledWith(
      'user-123',
      'OldPass123!',
      'NewPass123!',
      false,
    );
  });

  it('changePassword mutation accepts logoutFromOtherDevices argument', async () => {
    authService.changePassword.mockResolvedValue({
      message: 'Password changed successfully.',
    });

    const query = `
      mutation ChangePassword($changePasswordInput: ChangePasswordInput!) {
        changePassword(changePasswordInput: $changePasswordInput) {
          message
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: {
          changePasswordInput: {
            currentPassword: 'OldPass123!',
            newPassword: 'NewPass123!',
            logoutFromOtherDevices: true,
          },
        },
      })
      .expect(200);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.data.changePassword.message).toBe(
      'Password changed successfully.',
    );
    expect(authService.changePassword).toHaveBeenCalledWith(
      'user-123',
      'OldPass123!',
      'NewPass123!',
      true,
    );
  });
});
