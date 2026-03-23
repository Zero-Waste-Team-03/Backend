import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  logger = new Logger(AppService.name);
  getHello(): string {
    this.logger.log('Hello method called', {
      test: 'test log context',
      meta: { userId: 123 },
    });
    return 'Hello to core app';
  }
}
