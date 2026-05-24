import { Field, InputType, registerEnumType } from "@nestjs/graphql";
import { IsEnum, IsUUID } from "class-validator";

const VerficationStatusUpdate={
  APPROVED:'Approved',
  REJECTED:'Rejected'
} as const;

export type VerficationStatusUpdateType=typeof VerficationStatusUpdate[keyof typeof VerficationStatusUpdate]
registerEnumType(VerficationStatusUpdate,{name:'VerficationStatusUpdateEnum'})

@InputType('UpdateVerificationStatusInput')
export class UpdateVerificationStatusInput {
  @Field(() => String, { description: 'ID of the verification request to update' })
  @IsUUID()

  id: string;
  @IsEnum(VerficationStatusUpdate)
  @Field(() => VerficationStatusUpdate, { description: 'New status for the verification request' })
  status:VerficationStatusUpdateType;
}
