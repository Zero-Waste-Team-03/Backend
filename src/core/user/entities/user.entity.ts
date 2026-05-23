import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  BeforeInsert,
  Relation,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Location } from '../../../common/locations/entities/location.entity';
import { Attachment } from '../../../common/modules/attachment/entities/attachment.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Token } from '../../notifications/entities/token.entity';
import { UserSettings } from './user-settings.entity';

export const UserRoleValues = {
  USER: 'User',
  LOCAL_AUTHORITY: 'Local Authority',
  ORGANIZATION: 'Organizations',
  STORE: 'Stores',
  ADMINISTRATOR: 'Administrator',
} as const;

export type UserRole = (typeof UserRoleValues)[keyof typeof UserRoleValues];

export const UserStatusValues = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
} as const;

export type UserStatus =
  (typeof UserStatusValues)[keyof typeof UserStatusValues];

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

  @Column({
    type: 'varchar',
    nullable: true,
    length: 20,
  })
  phoneNumber?: string;

  @Column({ type: 'int', default: 0 })
  reputationScore: number;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isFoodSaver: boolean;

  @Column({ type: 'int', default: 0 })
  resetVersion: number;

  @ManyToOne(() => Location, { nullable: true, cascade: true })
  @JoinColumn({ name: 'locationId' })
  location: Relation<Location>;

  @Column('uuid', { nullable: true })
  locationId?: string;

  @ManyToOne(() => Attachment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatarAttachmentId' })
  avatar: Relation<Attachment>;

  @Column('uuid', { nullable: true })
  avatarAttachmentId?: string;

  @Column({
    type: 'enum',
    enum: UserStatusValues,
    default: UserStatusValues.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastChangedPasswordDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Notification, (notification) => notification.receiver)
  notifications: Relation<Notification[]>;

  @OneToMany(() => Token, (token) => token.user)
  tokens: Relation<Token[]>;

  @OneToOne('UserSettings', 'user', { cascade: true })
  settings: Relation<UserSettings>;

  @BeforeInsert()
  generateIdAndSettings() {
    if (!this.id) {
      this.id = uuidv7();
    }
    if (!this.settings) {
      this.settings = new UserSettings();
    }
  }
}
