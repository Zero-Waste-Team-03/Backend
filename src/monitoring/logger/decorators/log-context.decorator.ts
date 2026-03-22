/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@nestjs/common';

export interface LogContextOptions {
  /**
   * Map method arguments to context keys by position.
   * e.g. ['eventId', 'userId'] maps args[0]->eventId, args[1]->userId
   */
  args?: string[];
  /** Override the log message prefix (defaults to method name) */
  description?: string;
  /** Log level for successful completion (default: 'log') */
  level?: 'log' | 'debug' | 'verbose';
}

/**
 * Decorator to automatically log method entry/exit with arguments, duration, and error details.
 * It expects the class to have a `logger` property (compatible with NestJS LoggerService).
 * If no logger is found, it creates a transient Logger instance.
 */
export function LogContext(options: LogContextOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 1. Locate or Create Logger
      // Most services have `private readonly logger = new Logger(...)`
      // We cast to any to access private properties
      const logger = this.logger || new Logger(target.constructor.name);

      const methodId = options.description || propertyKey;
      const successLevel = options.level || 'log';

      // 2. Build Context from Arguments
      const context: Record<string, any> = {};
      if (options.args) {
        options.args.forEach((key, index) => {
          if (args[index] !== undefined) {
            // Pass raw objects; Winston/Loki handles serialization
            context[key] = args[index];
          }
        });
      }

      const start = Date.now();
      try {
        // 3. Execute Method
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const result = await originalMethod.apply(this, args);

        // 4. Log Success
        const duration = Date.now() - start;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        logger[successLevel](`${methodId} completed in ${duration}ms`, {
          ...context,
          duration,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
      } catch (error) {
        // 5. Log Error
        const duration = Date.now() - start;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        logger.error(`${methodId} failed after ${duration}ms`, {
          ...context,
          duration,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    };
    return descriptor;
  };
}
