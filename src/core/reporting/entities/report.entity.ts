import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from 'src/core/user/entities/user.entity';

export const ReportTargetTypeValues = {
  USER: 'User',
  MESSAGE: 'Message',
  DONATION: 'Donation',
} as const;

export const ReportStatusValues = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under Review',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
} as const;

export type ReportTargetType =
  (typeof ReportTargetTypeValues)[keyof typeof ReportTargetTypeValues];

export type ReportStatus =
  (typeof ReportStatusValues)[keyof typeof ReportStatusValues];

@Entity('reports')
@Index('IDX_reports_target', ['targetType', 'targetId'])
@Index('IDX_reports_reporter_id', ['reporterId'])
@Index('IDX_reports_status', ['status'])
@Index('IDX_reports_created_at', ['createdAt'])
export class Report {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReportTargetTypeValues,
  })
  targetType: ReportTargetType;

  @Column('uuid')
  targetId: string;

  @Column('uuid')
  reporterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: Relation<User>;

  @Column({ type: 'varchar', length: 120 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: ReportStatusValues,
    default: ReportStatusValues.OPEN,
  })
  status: ReportStatus;

  @Column('uuid', { nullable: true })
  reviewedById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy?: Relation<User>;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

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
