import { InputType, PartialType } from '@nestjs/graphql';
import { CreateBadgeInput } from './create-badge.input';

@InputType('UpdateBadgeInput')
export class UpdateBadgeInput extends PartialType(CreateBadgeInput) {}
