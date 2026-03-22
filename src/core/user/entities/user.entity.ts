import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  Relation,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Location } from '../../../common/locations/entities/location.entity';
import { Attachment } from '../../../common/modules/attachment/entities/attachment.entity';

export const UserRoleValues = {
  USER: 'User',
  LOCAL_AUTHORITY: 'Local Authority',
  ORGANIZATION: 'Organizations',
  STORE: 'Stores',
  ADMINISTRATOR: 'Administrator',
} as const;

export type UserRole = (typeof UserRoleValues)[keyof typeof UserRoleValues];

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: UserRoleValues,
    default: UserRoleValues.USER,
  })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  reputationScore: number;

  @Column({ type: 'boolean', default: false })
  isMailVerified: boolean;

  @Column({ type: 'int', default: 0 })
  resetVersion: number;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'locationId' })
  location: Relation<Location>;

  @Column('string')
  locationId?: string;

  @ManyToOne(() => Attachment, { nullable: true })
  @JoinColumn({ name: 'avatarAttachmentId' })
  avatar: Relation<Attachment>;

  avatarAttachmentId?: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
