import { INestApplication } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GqlExecutionContext } from '@nestjs/graphql';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { DonationResolver } from 'src/core/donation/donation.resolver';
import { DonationService } from 'src/core/donation/v1/donation.service';
import { AccessTokenGuard } from 'src/core/authentication/guards/access-token.guard';

describe('Donation Likes GraphQL (e2e)', () => {
  let app: INestApplication<App>;

  const donationService = {
    getStatistics: jest.fn(),
    getDonationsForMap: jest.fn(),
    getDonationsHeatmap: jest.fn(),
    findAll: jest.fn(),
    findLikedDonations: jest.fn(),
    createDonation: jest.fn(),
    updateDonation: jest.fn(),
    getDonationById: jest.fn(),
    likeDonation: jest.fn(),
    unlikeDonation: jest.fn(),
    deleteDonation: jest.fn(),
  };

  const accessTokenGuard: CanActivate = {
    canActivate(context: ExecutionContext): boolean {
      const gqlContext = GqlExecutionContext.create(context);
      const requestContext = gqlContext.getContext<{
        req?: { user?: { id: string; role: string } };
      }>();

      if (requestContext.req) {
        requestContext.req.user = { id: 'user-123', role: 'User' };
      }
      return true;
    },
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
        DonationResolver,
        {
          provide: DonationService,
          useValue: donationService,
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

  it('likeDonation mutation should call service with authenticated user', async () => {
    donationService.likeDonation.mockResolvedValue({
      message: 'Donation liked successfully',
    });

    const query = `
      mutation LikeDonation($donationId: ID!) {
        likeDonation(donationId: $donationId) {
          message
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables: { donationId: 'd-1' } })
      .expect(200);

    expect(response.body.data.likeDonation.message).toBe(
      'Donation liked successfully',
    );
    expect(donationService.likeDonation).toHaveBeenCalledWith(
      'd-1',
      'user-123',
    );
  });

  it('unlikeDonation mutation should call service with authenticated user', async () => {
    donationService.unlikeDonation.mockResolvedValue({
      message: 'Donation unliked successfully',
    });

    const query = `
      mutation UnlikeDonation($donationId: ID!) {
        unlikeDonation(donationId: $donationId) {
          message
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables: { donationId: 'd-1' } })
      .expect(200);

    expect(response.body.data.unlikeDonation.message).toBe(
      'Donation unliked successfully',
    );
    expect(donationService.unlikeDonation).toHaveBeenCalledWith(
      'd-1',
      'user-123',
    );
  });

  it('likedDonations query should support same filter fields and include liked flag', async () => {
    donationService.findLikedDonations.mockResolvedValue({
      items: [
        {
          id: 'd-1',
          userId: 'owner-1',
          categoryId: 'cat-1',
          title: 'Saved food',
          description: 'desc',
          quantity: 3,
          foodWeightKg: 1.5,
          specification: {},
          expiryDate: new Date('2030-01-01T00:00:00.000Z'),
          urgency: 'Low',
          safetyChecklistCompleted: false,
          status: 'Published',
          attachmentIds: [],
          isLikedByMe: true,
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
          updatedAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      ],
      totalCount: 1,
      page: 1,
      limit: 10,
      hasNextPage: false,
      hasPreviousPage: false,
    });

    const query = `
      query LikedDonations($filter: DonationsFilterInput, $pagination: PaginationInput) {
        likedDonations(filter: $filter, pagination: $pagination) {
          items {
            id
            title
            isLikedByMe
          }
          totalCount
          page
          limit
          hasNextPage
          hasPreviousPage
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: {
          filter: { categoryId: 'cat-1' },
          pagination: { page: 1, limit: 10 },
        },
      })
      .expect(200);

    expect(response.body.data.likedDonations.items[0]).toEqual(
      expect.objectContaining({ id: 'd-1', isLikedByMe: true }),
    );
    expect(donationService.findLikedDonations).toHaveBeenCalledWith(
      'user-123',
      { categoryId: 'cat-1' },
      { page: 1, limit: 10 },
    );
  });

  it('likedDonations query should not accept behaviorContext argument', async () => {
    const query = `
      query LikedDonationsWithBehaviorContext($pagination: PaginationInput) {
        likedDonations(
          pagination: $pagination,
          behaviorContext: { origin: "list", distanceBucket: "1km" }
        ) {
          totalCount
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: {
          pagination: { page: 1, limit: 10 },
        },
      })
      .expect(400);

    expect(response.body.errors[0].message).toContain(
      'Unknown argument "behaviorContext" on field "Query.likedDonations"',
    );
  });
});
