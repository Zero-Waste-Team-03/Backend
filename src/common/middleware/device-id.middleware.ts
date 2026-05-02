import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { ExtendedRequest } from 'src/core/authentication/types/extended-req.type';

/**
 * Extracts the `x-device-id` header and attaches it to the request.
 * Runs as middleware so the value is available before guards execute.
 */
@Injectable()
export class DeviceIdMiddleware implements NestMiddleware {
  use(req: ExtendedRequest, _res: Response, next: NextFunction): void {
    const headerValue = req.headers?.['x-device-id'];

    console.log('DeviceIdMiddleware invoked, x-device-id:', headerValue);
    if (typeof headerValue === 'string') {
      req.deviceId = headerValue;
    } else if (Array.isArray(headerValue) && headerValue.length > 0) {
      req.deviceId = headerValue[0];
    }

    next();
  }
}
