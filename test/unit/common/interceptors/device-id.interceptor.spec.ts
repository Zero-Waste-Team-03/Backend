import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { of } from 'rxjs';
import { DeviceIdInterceptor } from 'src/common/interceptors/device-id.interceptor';

describe('DeviceIdInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('attaches deviceId for HTTP requests', (done) => {
    const interceptor = new DeviceIdInterceptor();
    const request = {
      headers: {
        'x-device-id': 'device-http-123',
      },
    } as { headers: Record<string, string>; deviceId?: string };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getType: () => 'http',
    } as unknown as GqlExecutionContext);

    interceptor.intercept(context, { handle: () => of('ok') }).subscribe({
      next: () => {
        expect(request.deviceId).toBe('device-http-123');
        done();
      },
      error: done,
    });
  });

  it('attaches deviceId for GraphQL requests', (done) => {
    const interceptor = new DeviceIdInterceptor();
    const request = {
      headers: {
        'x-device-id': 'device-gql-456',
      },
    } as { headers: Record<string, string>; deviceId?: string };

    const context = {} as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getType: () => 'graphql',
      getContext: () => ({ req: request }),
    } as unknown as GqlExecutionContext);

    interceptor.intercept(context, { handle: () => of('ok') }).subscribe({
      next: () => {
        expect(request.deviceId).toBe('device-gql-456');
        done();
      },
      error: done,
    });
  });

  it('leaves deviceId undefined when header is missing', (done) => {
    const interceptor = new DeviceIdInterceptor();
    const request = {
      headers: {},
    } as { headers: Record<string, string>; deviceId?: string };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getType: () => 'http',
    } as unknown as GqlExecutionContext);

    interceptor.intercept(context, { handle: () => of('ok') }).subscribe({
      next: () => {
        expect(request.deviceId).toBeUndefined();
        done();
      },
      error: done,
    });
  });
});
