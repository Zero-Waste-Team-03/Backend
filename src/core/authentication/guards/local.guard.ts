import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Guard for email/password authentication
 *
 * Supports both HTTP (REST) and GraphQL contexts by implementing
 * the getRequest method to extract the request object appropriately
 *
 * Validates user credentials using the LocalStrategy
 *
 * @example
 * // REST usage
 * @UseGuards(LocalGuard)
 * @Post('login')
 * login(@USER() user: User) { ... }
 *
 * @example
 * // GraphQL usage
 * @UseGuards(LocalGuard)
 * @Mutation(() => AuthResponse)
 * login(@USER() user: User) { ... }
 */
export class LocalGuard extends AuthGuard('local') {
  constructor() {
    super();
  }

  /**
   * Extracts the request object from either HTTP or GraphQL context
   *
   * @param context - The execution context (HTTP or GraphQL)
   * @returns The request object containing body with email and password
   */
  getRequest(context: ExecutionContext): any {
    const ctx = GqlExecutionContext.create(context);
    const request = (ctx.getContext<{ req?: any }>()?.req ||
      context.switchToHttp().getRequest<any>()) as { body?: any };

    // For GraphQL, credentials come from args instead of body
    // We need to map them to the request body for passport-local strategy
    if (ctx.getContext<{ req?: any }>()?.req) {
      const args = ctx.getArgs<{
        loginInput?: { email?: string; password?: string };
      }>();
      if (args.loginInput) {
        request.body = {
          email: args.loginInput.email,
          password: args.loginInput.password,
        };
      }
    }

    return request;
  }
}
