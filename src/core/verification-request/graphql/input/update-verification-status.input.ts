import { Field, InputType, registerEnumType } from "@nestjs/graphql";

const VerficationStatusUpdate={
  VERIFIED:'verified',
  REJECTED:'rejected'
}

export type VerficationStatusUpdateType=typeof VerficationStatusUpdate[keyof typeof VerficationStatusUpdate]
registerEnumType(VerficationStatusUpdate,{name:'VerficationStatusUpdateEnum'})

@InputType('UpdateVerificationStatusInput')
export class UpdateVerificationStatusInput {
  @Field(() => String, { description: 'ID of the verification request to update' })
  id: string;
  @Field(() => VerficationStatusUpdate, { description: 'New status for the verification request' })
  status:VerficationStatusUpdateType;
}
