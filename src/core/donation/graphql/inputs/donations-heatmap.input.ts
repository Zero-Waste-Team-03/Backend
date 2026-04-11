import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MapBoundsInput } from './map-bounds.input';
import { DateRangeInput } from './date-range.input';

@InputType('DonationsHeatmapInput')
export class DonationsHeatmapInput {
  @Field(() => MapBoundsInput)
  @ValidateNested()
  @Type(() => MapBoundsInput)
  bounds: MapBoundsInput;

  @Field(() => Float, { nullable: true, defaultValue: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  @Max(1)
  gridSize?: number;

  @Field(() => DateRangeInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeInput)
  dateRange?: DateRangeInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categories?: string[];
}
