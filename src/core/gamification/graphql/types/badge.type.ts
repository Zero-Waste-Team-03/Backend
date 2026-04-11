import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { AttachementType } from 'src/common/modules/attachment/graphql/attachement.type';

@ObjectType('Badge')
export class BadgeType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  code: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => String, { nullable: true })
  iconAttachmentId?: string | null;

  @Field(() => AttachementType, { nullable: true })
  iconAttachment?: AttachementType;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
