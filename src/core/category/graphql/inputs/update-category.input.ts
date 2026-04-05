import { InputType, PartialType } from '@nestjs/graphql';
import { CreateCategoryInput } from './create-category.input';

@InputType('UpdateCategoryInput')
export class UpdateCategoryInput extends PartialType(CreateCategoryInput) {}
