import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ExtendedRequest } from '../types/extended-req.type';
import { GqlExecutionContext } from '@nestjs/graphql';

export class FoodSaverGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = this.getRequest(context);
    const user = request.user;
    return user.isFoodSaver;
  }
  private getRequest(context: ExecutionContext): ExtendedRequest {
    const gqlCtx = GqlExecutionContext.create(context);
    const gqlRequest = gqlCtx.getContext<{ req?: ExtendedRequest }>()?.req;
    if (gqlRequest) {
      return gqlRequest;
    }
    return context.switchToHttp().getRequest<ExtendedRequest>();
  }
}
