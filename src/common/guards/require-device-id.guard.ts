import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExtendedRequest } from 'src/core/authentication/types/extended-req.type';
import { throwAppError } from 'src/common/errors';

/**
 * Guard that rejects requests missing the `x-device-id` header.
 * Relies on DeviceIdInterceptor having already attached `deviceId`
 * to the request. Supports both HTTP and GraphQL contexts.
 */
@Injectable()
export class RequireDeviceIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlCtx = GqlExecutionContext.create(context);
    const request =
      gqlCtx.getType() === 'graphql'
        ? gqlCtx.getContext<{ req: ExtendedRequest }>().req
        : context.switchToHttp().getRequest<ExtendedRequest>();
   const deviceId=request.headers['x-device-id']
    if (!deviceId) {
      throwAppError('NOTIFICATION_DEVICE_ID_REQUIRED');
    } 
    if (typeof deviceId === 'string') {
      request.deviceId = deviceId;

        return true;
    }
    return false;
  }
}
