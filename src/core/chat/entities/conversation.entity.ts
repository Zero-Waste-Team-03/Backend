import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Reservation } from 'src/core/reservation/entities/reservation.entity';
import { Message } from './message.entity';

export const ConversationStatusValues = {
  LOCKED: 'Locked',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
} as const;

export type ConversationStatus =
  (typeof ConversationStatusValues)[keyof typeof ConversationStatusValues];

@Entity('conversations')
@Index('UQ_conversations_reservation_id', ['reservationId'], { unique: true })
export class Conversation {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  reservationId: string;

  @OneToOne(() => Reservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationId' })
  reservation: Relation<Reservation>;

  @Column({ type: 'varchar', nullable: true })
  lastMessage?: string | null;

  @Column({
    type: 'enum',
    enum: ConversationStatusValues,
    default: ConversationStatusValues.LOCKED,
  })
  status: ConversationStatus;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Relation<Message[]>;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
