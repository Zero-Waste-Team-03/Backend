import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../../../../core/user/entities/user.entity';

export const UploadStatusValues = {
  PENDING: 'PENDING',
  UPLOADING: 'UPLOADING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type UploadStatus =
  (typeof UploadStatusValues)[keyof typeof UploadStatusValues];
@Entity('attachments')
export class Attachment {
  @PrimaryColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  fileName: string;

  @Column({ type: 'varchar' })
  fileType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({ type: 'varchar', nullable: true })
  url: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedBy' })
  uploadedBy: Relation<User>;

  @Column({
    type: 'enum',
    enum: UploadStatusValues,
    default: UploadStatusValues.PENDING,
  })
  uploadStatus: UploadStatus;

  @Column({ type: 'varchar', nullable: true })
  jobId: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    this.id = uuidv7();
  }
}
