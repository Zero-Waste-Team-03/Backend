import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseFormatterInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map((data: unknown) => {
        const gqlContext = GqlExecutionContext.create(context);
        const isGraphQL = gqlContext.getType() === 'graphql';

        if (isGraphQL) return data; // Don't format GraphQL responses, return as is

        return {
          success: true,
          timeStamp: new Date().toISOString(),
          data,
        };
      }),
    );
  }
}
