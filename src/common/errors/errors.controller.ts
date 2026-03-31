import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ERROR_CODES } from './error-codes';

@ApiTags('Errors')
@Controller('errors')
export class ErrorsController {
  @Get()
  @ApiOperation({ summary: 'Error code catalog for client code generation' })
  getErrorCatalog() {
    return Object.values(ERROR_CODES).map((entry) => ({
      code: entry.code,
      httpStatus: entry.httpStatus,
      message: entry.message,
      args: 'args' in entry ? entry.args : null,
    }));
  }
}
