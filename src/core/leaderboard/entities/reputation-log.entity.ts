import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export const ReputationLogSourceValues = {
  DONATION_COMPLETED: 'DONATION_COMPLETED',
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
} as const;

export type ReputationLogSource =
  (typeof ReputationLogSourceValues)[keyof typeof ReputationLogSourceValues];

@Entity('reputation_logs')
export class ReputationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column('uuid')
  userId: string;

  @Column({ type: 'int' })
  pointsGained: number;

  @Column({
    type: 'enum',
    enum: ReputationLogSourceValues,
    default: ReputationLogSourceValues.DONATION_COMPLETED,
  })
  source: ReputationLogSource;

  @Column({ type: 'varchar', nullable: true })
  referenceId?: string; // ID of the donation/reservation/etc.

  @CreateDateColumn()
  createdAt: Date;
}
