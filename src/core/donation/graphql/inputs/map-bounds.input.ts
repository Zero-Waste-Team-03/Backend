import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CoordinateInput } from './coordinate.input';

@InputType('MapBoundsInput')
export class MapBoundsInput {
  @Field(() => CoordinateInput)
  @ValidateNested()
  @Type(() => CoordinateInput)
  northEast: CoordinateInput;

  @Field(() => CoordinateInput)
  @ValidateNested()
  @Type(() => CoordinateInput)
  southWest: CoordinateInput;
}
