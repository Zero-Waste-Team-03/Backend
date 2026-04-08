import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNumber, Max, Min } from 'class-validator';

@InputType()
export class DonationsMapInput {
  @Field(() => Float, { description: 'Radius in kilometers' })
  @IsNumber()
  @Min(0)
  radius: number;

  @Field(() => Float, { description: 'Center latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Field(() => Float, { description: 'Center longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
