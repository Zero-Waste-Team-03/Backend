import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType('Token')
export class TokenTypeGraphQL {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  fcmToken: string;

  @Field(() => String)
  userId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
