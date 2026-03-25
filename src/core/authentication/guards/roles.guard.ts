import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from 'src/core/user/entities/user.entity';

interface RequestWithUser {
  user?: AccessTokenPayload;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Validates that the authenticated user has at least one of the roles
   * declared by the @Roles decorator.
   *
   * If no roles metadata is found, this guard is skipped.
   *
   * @param context - Current execution context (HTTP or GraphQL)
   * @returns True when access is allowed
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = this.getRequest(context);

    if (!user?.role) {
      throw new ForbiddenException('User role not found in request');
    }

    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }

  /**
   * Extracts request object from either GraphQL or HTTP context.
   *
   * @param context - Current execution context
   * @returns Request object
   */
  private getRequest(context: ExecutionContext): RequestWithUser {
    const gqlCtx = GqlExecutionContext.create(context);
    const gqlRequest = gqlCtx.getContext<{ req?: RequestWithUser }>()?.req;

    if (gqlRequest) {
      return gqlRequest;
    }

    return context.switchToHttp().getRequest<RequestWithUser>();
  }
}
