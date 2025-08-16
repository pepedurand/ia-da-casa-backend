import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 254 })
  nome: string;

  @Column({ length: 254 })
  sobrenome: string;

  @Column({ length: 254 })
  email: string;

  @Column({ length: 254, select: false })
  senha: string;

  @Column({ length: 254, nullable: true })
  refreshToken?: string;

  @Column({ type: 'date', nullable: true })
  dataNascimento: Date;

  @Column({ type: 'varchar', nullable: true })
  rg: string;

  @Column({
    type: 'varchar',
    default: "'PF'",
    length: 2,
  })
  tipoPessoa: string;

  @Column({ type: 'varchar', nullable: true })
  cpf: string;

  @Column({ type: 'varchar', nullable: true })
  cnpj: string;

  @Column({ type: 'varchar', nullable: true })
  celular?: string;
}
