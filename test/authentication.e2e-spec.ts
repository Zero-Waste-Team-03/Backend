import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Query, Resolver } from '@nestjs/graphql';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AuthenticationResolver } from '../src/core/authentication/authentication.resolver';
import { AuthenticationService } from '../src/core/authentication/v1/authentication.service';

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
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
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
      ],
    }).compile();

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
            confirmPassword: 'StrongPass123!',
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

    expect(response.body.data.register.message).toBe(
      'User registered successfully.',
    );
    expect(authService.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
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

    expect(response.body.errors[0].message).toContain(
      'Cannot query field "verifyEmail" on type "Mutation"',
    );
  });
});
