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
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Conversation } from './conversation.entity';
import { User } from 'src/core/user/entities/user.entity';

@Entity('messages')
@Index('IDX_messages_conversation_id', ['conversationId'])
@Index('IDX_messages_sender_id', ['senderId'])
@Index('IDX_messages_created_at', ['createdAt'])
export class Message {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Relation<Conversation>;

  @Column('uuid')
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: Relation<User>;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isModerated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
