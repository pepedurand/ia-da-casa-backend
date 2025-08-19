// src/modules/atendimento/entities/reserva.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'reservas' })
export class ReservaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 120 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 160 })
  nome!: string;

  @Column({ type: 'int' })
  pessoas!: number;

  @Column({ type: 'timestamptz' })
  dataISO!: Date;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefone?: string;

  @Column({ type: 'text', nullable: true })
  obs?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
