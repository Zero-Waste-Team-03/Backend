import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { BeforeInsert } from 'typeorm';

export const CategorySensitivityValues = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

export type CategorySensitivity =
  (typeof CategorySensitivityValues)[keyof typeof CategorySensitivityValues];

@Entity('categories')
export class Category {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: CategorySensitivityValues,
    default: CategorySensitivityValues.LOW,
  })
  sensitivity: CategorySensitivity;

  @Column({
    type:'number',
    default: 0,
  })
  reputationGain: number;
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
