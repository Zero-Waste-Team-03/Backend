import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  Relation,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../user/entities/user.entity';

export const VerificationRequestStatusValues = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

export type VerificationRequestStatus =
  (typeof VerificationRequestStatusValues)[keyof typeof VerificationRequestStatusValues];

@Entity('verification_requests')
export class VerificationRequest {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: Relation<User>;

  @Column('uuid')
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetFoodSaverId' })
  targetFoodSaver: Relation<User>;

  @Column('uuid')
  targetFoodSaverId: string;

  @Column({
    type: 'enum',
    enum: VerificationRequestStatusValues,
    default: VerificationRequestStatusValues.PENDING,
  })
  status: VerificationRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
