import { Inject, LoggerService } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { ASYNC_STORAGE } from 'src/common/constants/injection';
import { LoggerStore } from './interfaces/logger_store.interface';
import { WinstonModule } from 'nest-winston';
import LokiTransport from 'winston-loki';
import winston, * as Winston from 'winston';
export class LoggerServiceBuilder {
  //This will be used for more complex transports like loki
  private job: string;
  constructor(
    @Inject(ASYNC_STORAGE) private readonly als: AsyncLocalStorage<LoggerStore>,
  ) {}
  setJob(job: string) {
    this.job = job;
    return this;
  }
  /**
   * @description Format log info to include requestId from AsyncLocalStorage store if available, for better traceability.(Another context can be added per project needs)
   * @param info Winston log info object
   * @return formatted log info object
   **/
  private formatInfo(
    info: Winston.Logform.TransformableInfo & {
      context: Record<string, any> | string;
    },
  ) {
    const store = this.als.getStore();
    if (store) {
      if (typeof info.context !== 'object' || info.context === null) {
        info.context = { service: info.context };
      }
      info.context['ipAdress'] = store.ipAddress;
      info.context['userId'] = store.userId;
      info.context['requestId'] = store.requestId;
    }
    return info;
  }
  build(env: string): LoggerService {
    const transports: Winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.errors({ stack: true })),
        level: process.env.LOG_LEVEL || 'info',
      }),
    ];
    if (env !== 'developement') {
      transports.push(
        new LokiTransport({
          format: winston.format.combine(
            winston.format(
              (
                info: winston.Logform.TransformableInfo & {
                  context: Record<string, any> | string;
                },
              ) => {
                return this.formatInfo(info);
              },
            )(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
          host: process.env.LOKI_HOST ?? 'http://localhost:3100',
          labels: {
            job: this.job,
            environment: env,
          },
          json: true,
          level: 'info',
          replaceTimestamp: true,
        }),
      );
    }
    return WinstonModule.createLogger({
      levels: Winston.config.npm.levels,
      transports,
    });
  }
}
