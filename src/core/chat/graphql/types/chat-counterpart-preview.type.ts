import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatCounterpartPreview')
export class ChatCounterpartPreviewType {
  @Field(() => String)
  displayName: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;
}
