import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_VALUES,
  NotificationType,
} from '../enums/notification-type.enum';

/**
 * @fileoverview Defines the Notification entity.
 * @module core/notifications/entities/notification
 */

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({
    description: 'The ID of the notification.',
    example: '019058b0-0000-7000-8000-000000000000',
  })
  id: string;

  @ApiProperty({
    description: 'The title of the notification.',
    example: 'New Message',
  })
  @Column({ type: 'varchar' })
  title: string;

  @ApiProperty({
    description: 'The type of the notification.',
    enum: NOTIFICATION_TYPE_VALUES,
    example: NOTIFICATION_TYPE.TEST,
  })
  @Column({
    type: 'enum',
    enum: NOTIFICATION_TYPE_VALUES,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'The body of the notification.',
    example: 'You have a new message from John Doe.',
  })
  @Column({ type: 'varchar' })
  body: string;

  @ApiProperty({
    description: 'The ID of the user who will receive the notification.',
    example: '019058b0-0000-7000-8000-000000000000',
  })
  @Column('uuid')
  receiverId: string;

  @ApiProperty({
    description: 'Additional metadata for the notification.',
    type: 'object',
    additionalProperties: true,
    example: { orderId: 123 },
  })
  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;

  @ManyToOne('User', 'notifications', { onDelete: 'CASCADE' })
  receiver: Relation<User>;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn()
  @ApiProperty({
    description: 'The creation date of the notification.',
    example: '2022-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({
    description: 'The update date of the notification.',
    example: '2022-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
