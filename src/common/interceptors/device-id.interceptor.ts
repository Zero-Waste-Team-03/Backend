import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { ExtendedRequest } from 'src/core/authentication/types/extended-req.type';

/**
 * Global interceptor that extracts the x-device-id header and
 * attaches it to the request object for later use.
 */
@Injectable()
export class DeviceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const isGraphQL = gqlContext.getType() === 'graphql';

    const request = isGraphQL
      ? gqlContext.getContext<{ req: ExtendedRequest }>().req
      : context.switchToHttp().getRequest<ExtendedRequest>();

    const headerValue = request?.headers?.['x-device-id'];
    if (typeof headerValue === 'string') {
      request.deviceId = headerValue;
    } else if (Array.isArray(headerValue) && headerValue.length > 0) {
      request.deviceId = headerValue[0];
    }

    return next.handle();
  }
}
