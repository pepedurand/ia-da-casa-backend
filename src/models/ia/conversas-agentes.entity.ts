import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@Entity('ConversasAgentes')
export class ConversasAgentes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar')
  agent: string;

  @Column('varchar')
  threadId: string;

  @Column('varchar')
  title: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'lastUpdated' })
  lastUpdated: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'userId' })
  usuario: Usuario;
}
