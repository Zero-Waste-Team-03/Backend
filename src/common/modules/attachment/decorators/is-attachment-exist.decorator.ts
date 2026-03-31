import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentService } from '../attachment.service';

/**
 * Custom validation constraint to check if an attachment exists in the database
 */
@ValidatorConstraint({ name: 'isAttachmentExist', async: true })
@Injectable()
export class IsAttachmentExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly attachmentService: AttachmentService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validate(id: string, args: ValidationArguments) {
    if (!id) return true;
    const attachment = await this.attachmentService.getAttachmentById(id);

    if (!attachment) {
      throw new NotFoundException({
        errCode: 'attachment_not_found',
        message: `Attachment with ID ${id} not found`,
      });
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `Attachment with ID ${args.value} does not exist`;
  }
}

/**
 * Decorator to validate that an attachment ID exists in the database
 */
export function IsAttachmentExist(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAttachmentExistConstraint,
    });
  };
}
