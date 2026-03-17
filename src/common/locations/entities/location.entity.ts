import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

@Entity('locations')
export class Location {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'float', nullable: true })
    latitude: number;

    @Column({ type: 'float', nullable: true })
    longitude: number;

    @Column({ type: 'varchar', nullable: true })
    neighborhood: string;

    @Column({ type: 'varchar', nullable: true })
    city: string;

    @Column({ type: 'varchar', nullable: true })
    country: string;

    @CreateDateColumn()
    createdAt: Date;

    @BeforeInsert()
    generateId() {
        if (!this.id) {
            this.id = uuidv7();
        }
    }
}
