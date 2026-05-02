import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RequireDeviceIdGuard } from 'src/common/guards/require-device-id.guard';

describe('RequireDeviceIdGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows the request when deviceId is attached (HTTP)', () => {
    const guard = new RequireDeviceIdGuard();
    const request = { deviceId: 'device-http-123' };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getType: () => 'http',
    } as unknown as GqlExecutionContext);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the request when deviceId is attached (GraphQL)', () => {
    const guard = new RequireDeviceIdGuard();
    const request = { deviceId: 'device-gql-456' };
    const context = {} as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getType: () => 'graphql',
      getContext: () => ({ req: request }),
    } as unknown as GqlExecutionContext);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws NOTIFICATION_DEVICE_ID_REQUIRED when deviceId is missing', () => {
    const guard = new RequireDeviceIdGuard();
    const request = {};
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getType: () => 'http',
    } as unknown as GqlExecutionContext);

    try {
      guard.canActivate(context);
      fail('expected guard to throw');
    } catch (err: unknown) {
      const payload = (
        err as { getResponse?: () => { errCode?: string } }
      ).getResponse?.();
      expect(payload?.errCode).toBe('notification.device_id_required');
    }
  });
});
