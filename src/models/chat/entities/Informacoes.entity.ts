import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Informacoes')
export class InformacoesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  kind: string;

  @Column({ type: 'jsonb' })
  data: any;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
