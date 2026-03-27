import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateTokenInput {
  @Field(() => String)
  fcmToken: string;
}
