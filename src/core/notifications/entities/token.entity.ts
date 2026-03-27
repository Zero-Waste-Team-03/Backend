import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import type { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @fileoverview Defines the Token entity for storing user device tokens.
 * @module core/authentication/entities/token
 */

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({
    description: 'The ID of the token.',
    example: '019058b0-0000-7000-8000-000000000000',
  })
  id: string;

  @ApiProperty({
    description: 'The FCM or device token.',
    example: 'bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1...',
  })
  @Column({ type: 'varchar', unique: true })
  fcmToken: string;

  @ApiProperty({
    description: 'The ID of the user associated with the token.',
    example: '019058b0-0000-7000-8000-000000000000',
  })
  @Column('uuid')
  userId: string;

  @ManyToOne('User', 'tokens')
  user: Relation<User>;

  @CreateDateColumn()
  @ApiProperty({
    description: 'The creation date of the token.',
    example: '2022-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({
    description: 'The update date of the token.',
    example: '2022-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
