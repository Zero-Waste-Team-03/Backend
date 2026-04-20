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
import { Donation } from 'src/core/donation/entities/donation.entity';

export const ReservationStatusValues = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
} as const;

export type ReservationStatus =
  (typeof ReservationStatusValues)[keyof typeof ReservationStatusValues];

@Entity('reservations')
@Index('IDX_reservations_donation_id', ['donationId'])
@Index('IDX_reservations_beneficiary_id', ['beneficiaryId'])
@Index('IDX_reservations_status', ['status'])
@Index(
  'UQ_one_active_reservation_per_donation_beneficiary',
  ['donationId', 'beneficiaryId'],
  {
    unique: true,
    where: "\"status\" IN ('Pending', 'Confirmed')",
  },
)
export class Reservation {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  donationId: string;

  @ManyToOne(() => Donation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'donationId' })
  donation: Relation<Donation>;

  @Column('uuid')
  beneficiaryId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiaryId' })
  beneficiary: Relation<User>;

  @Column({
    type: 'enum',
    enum: ReservationStatusValues,
    default: ReservationStatusValues.PENDING,
  })
  status: ReservationStatus;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date | null;

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
