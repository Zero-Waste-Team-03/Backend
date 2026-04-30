import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  BeforeInsert,
  Relation,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import type { User } from './user.entity';

export enum AppearanceTheme {
  SYSTEM = 'System',
  DARK = 'Dark',
  LIGHT = 'Light',
}

@Entity('user_settings')
export class UserSettings {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: true })
  isNewDonationsAlertsEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  isUrgentAlertsEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  isSystemReports: boolean;

  @Column({ type: 'boolean', default: true })
  isPushNotificationsEnabled: boolean;

  @Column({
    type: 'enum',
    enum: AppearanceTheme,
    default: AppearanceTheme.SYSTEM,
  })
  appearance: AppearanceTheme;

  @OneToOne('User', 'settings', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column('uuid')
  userId: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
