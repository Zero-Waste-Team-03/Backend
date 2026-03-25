import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RolesGuard } from './roles.guard';
import { UserRoleValues } from 'src/core/user/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when no roles metadata is defined', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride.mock.calls[0]).toEqual([
      'roles',
      [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
    ]);
  });

  it('returns true when required role matches user role (HTTP)', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleValues.ADMINISTRATOR]);

    const request = {
      user: {
        role: UserRoleValues.ADMINISTRATOR,
      },
    };

    (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => request,
    });

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: undefined }),
    } as unknown as GqlExecutionContext);

    const result = guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });

  it('returns false when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleValues.ADMINISTRATOR]);

    (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => ({}),
    });

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: undefined }),
    } as unknown as GqlExecutionContext);

    const result = guard.canActivate(mockExecutionContext);

    expect(result).toBe(false);
  });

  it('returns false when user role does not match', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleValues.ADMINISTRATOR]);

    const request = {
      user: {
        role: UserRoleValues.USER,
      },
    };

    (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => request,
    });

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: undefined }),
    } as unknown as GqlExecutionContext);

    const result = guard.canActivate(mockExecutionContext);

    expect(result).toBe(false);
  });

  it('returns true when required role matches user role (GraphQL)', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleValues.ADMINISTRATOR]);

    const gqlRequest = {
      user: {
        role: UserRoleValues.ADMINISTRATOR,
      },
    };

    (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => ({ user: { role: UserRoleValues.USER } }),
    });

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: gqlRequest }),
    } as unknown as GqlExecutionContext);

    const result = guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });
});
