import { Injectable } from '@nestjs/common';
import { LogContext } from './monitoring/logger/decorators/log-context.decorator';

@Injectable()
export class AppService {
  @LogContext()
  getHello(): string {
    return 'Hello to core app';
  }
}
