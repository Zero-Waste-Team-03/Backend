import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { IsAttachmentExist } from 'src/common/modules/attachment/decorators/is-attachment-exist.decorator';

@InputType('CreateBadgeInput')
export class CreateBadgeInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  code: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  @IsAttachmentExist()
  iconAttachmentId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
