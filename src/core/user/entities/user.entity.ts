import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Location } from '../../../common/locations/entities/location.entity';
import { Attachment } from '../../../infrastructure/cloudinary/entities/attachment.entity';

export enum UserRole {
  USER = 'User',
  LOCAL_AUTHORITY = 'Local Authority',
  ORGANIZATION = 'Organizations',
  STORE = 'Stores',
  ADMINISTRATOR = 'Administrator',
}

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
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  reputationScore: number;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isMailVerified: boolean;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @ManyToOne(() => Attachment, { nullable: true })
  @JoinColumn({ name: 'avatarAttachmentId' })
  avatar: Attachment;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
