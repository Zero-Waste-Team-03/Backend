import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Location')
export class LocationType {
  @Field(() => String, { description: 'Location unique identifier' })
  id: string;

  @Field(() => Number, { nullable: true, description: 'Location latitude' })
  latitude?: number;

  @Field(() => Number, { nullable: true, description: 'Location longitude' })
  longitude?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Location neighborhood',
  })
  neighborhood?: string;
  @Field(() => String, { nullable: true, description: 'Location zip code' })
  zipCode?: string;

  @Field(() => String, { nullable: true, description: 'Location city' })
  city?: string;

  @Field(() => String, { nullable: true, description: 'Location country' })
  country?: string;
}
