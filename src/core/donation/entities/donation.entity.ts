import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from 'src/core/user/entities/user.entity';
import { Category } from 'src/core/category/entities/category.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { DonationPhoto } from './donation-photo.entity';

export const DonationStatusValues = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  RESERVED: 'Reserved',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
} as const;

export const DONATION_STATUS_OPTIONS = Object.values(DonationStatusValues);

export const DonationUrgencyValues = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

export const DONATION_URGENCY_OPTIONS = Object.values(DonationUrgencyValues);

export type DonationStatus =
  (typeof DonationStatusValues)[keyof typeof DonationStatusValues];

export type DonationUrgency =
  (typeof DonationUrgencyValues)[keyof typeof DonationUrgencyValues];

@Entity('donations')
@Index('IDX_donations_user_id', ['userId'])
@Index('IDX_donations_status', ['status'])
@Index('IDX_donations_expiry_date', ['expiryDate'])
@Index('IDX_donations_id_user_id', ['id', 'userId'])
@Index('IDX_donations_location_id', ['locationId'])
@Index('IDX_donations_listing_expires_at', ['listingExpiresAt'])
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
    enum: DonationUrgencyValues,
    default: DonationUrgencyValues.MEDIUM,
  })
  urgency: DonationUrgency;

  @Column({ type: 'boolean', default: false })
  safetyChecklistCompleted: boolean;

  @Column('uuid', { nullable: true })
  locationId?: string;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locationId' })
  location?: Relation<Location>;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  listingExpiresAt?: Date;

  @Column({
    type: 'enum',
    enum: DonationStatusValues,
    default: DonationStatusValues.DRAFT,
  })
  status: DonationStatus;

  @OneToMany(() => DonationPhoto, (photo) => photo.donation)
  photos: Relation<DonationPhoto[]>;

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
