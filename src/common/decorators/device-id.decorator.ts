import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExtendedRequest } from 'src/core/authentication/types/extended-req.type';

/**
 * Custom decorator to extract the deviceId from request
 *
 * Supports both HTTP (REST) and GraphQL contexts
 *
 * @example
 * // REST
 * getProfile(@DeviceId() deviceId?: string) { ... }
 *
 * @example
 * // GraphQL
 * currentUser(@DeviceId() deviceId?: string) { ... }
 */
export const DeviceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const gqlCtx = GqlExecutionContext.create(ctx);
    const request =
      gqlCtx.getType() === 'graphql'
        ? gqlCtx.getContext<{ req: ExtendedRequest }>().req
        : ctx.switchToHttp().getRequest<ExtendedRequest>();

    return request?.deviceId;
  },
);
