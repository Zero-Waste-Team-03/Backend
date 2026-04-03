import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { Donation } from './donation.entity';
import { Attachment } from 'src/common/modules/attachment/entities/attachment.entity';

@Entity('donation_photos')
@Index('IDX_donation_photos_donation_id', ['donationId'])
@Index('IDX_donation_photos_main_per_donation', ['donationId'], {
  unique: true,
  where: '"isMain" = true',
})
export class DonationPhoto {
  @PrimaryColumn('uuid')
  donationId: string;

  @ManyToOne(() => Donation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'donationId' })
  donation: Relation<Donation>;

  @PrimaryColumn('uuid')
  attachmentId: string;

  @ManyToOne(() => Attachment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attachmentId' })
  attachment: Relation<Attachment>;

  @Column({ type: 'boolean', default: false })
  isMain: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
