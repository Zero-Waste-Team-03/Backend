import {
  BeforeInsert,
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
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
  id: string;

  @Column({ type: 'varchar' })
  fileName: string;

  @Column({ type: 'varchar' })
  fileType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({ type: 'varchar', nullable: true })
  url: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: Relation<User>;

  @Column('uuid')
  uploadedById: string;

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
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
