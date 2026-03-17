import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../../../core/user/entities/user.entity';

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
  @PrimaryColumn('uuid', { default: () => uuidv7() })
  id: string;

  @Column({ type: 'varchar' })
  fileName: string;

  @Column({ type: 'varchar' })
  fileType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({ type: 'varchar' })
  url: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedBy' })
  uploadedBy: User;

  @Column({
    type: 'enum',
    enum: UploadStatusValues,
    default: UploadStatusValues.PENDING,
  })
  uploadStatus: UploadStatus;

  @Column({ type: 'uuid', nullable: true })
  jobId: string;

  @CreateDateColumn()
  createdAt: Date;
}
