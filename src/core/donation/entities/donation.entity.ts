import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from 'src/core/user/entities/user.entity';
import { Category } from 'src/core/category/entities/category.entity';
import { Attachment } from 'src/common/modules/attachment/entities/attachment.entity';

export const DonationStatusValues = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  RESERVED: 'Reserved',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
} as const;

export const DONATION_STATUS_OPTIONS = Object.values(DonationStatusValues);

export type DonationStatus =
  (typeof DonationStatusValues)[keyof typeof DonationStatusValues];

@Entity('donations')
export class Donation {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column('uuid')
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Relation<Category>;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'jsonb', default: {} })
  specification: Record<string, any>;

  @Column({ type: 'timestamp' })
  expiryDate: Date;

  @Column({
    type: 'enum',
    enum: DonationStatusValues,
    default: DonationStatusValues.DRAFT,
  })
  status: DonationStatus;

  @Column('uuid', { nullable: true })
  attachmentId?: string;

  @ManyToOne(() => Attachment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'attachmentId' })
  attachment?: Relation<Attachment>;

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
