import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { User } from 'src/core/user/entities/user.entity';
import { Donation } from './donation.entity';

/**
 * Tracks donation likes by user.
 * Composite primary key ensures one like per user per donation.
 */
@Entity('donation_likes')
@Index('IDX_donation_likes_user_created_at', ['userId', 'createdAt'])
@Index('IDX_donation_likes_donation_id', ['donationId'])
export class DonationLike {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('uuid')
  donationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Donation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'donationId' })
  donation: Relation<Donation>;

  @CreateDateColumn()
  createdAt: Date;
}
