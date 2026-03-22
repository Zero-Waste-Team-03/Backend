import { Injectable, Logger } from '@nestjs/common';
import { LogContext } from './monitoring/logger/decorators/log-context.decorator';

@Injectable()
export class AppService {
  logger = new Logger(AppService.name);
  @LogContext()
  getHello(): string {
    this.logger.log('Hello method called', {
      test: 'test log context',
      meta: { userId: 123 },
    });
    return 'Hello to core app';
  }
}
