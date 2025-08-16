import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CriaTabelaUsuarios1755350577315 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'Usuarios',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '254',
            isNullable: false,
          },
          {
            name: 'sobrenome',
            type: 'varchar',
            length: '254',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '254',
            isNullable: false,
          },
          {
            name: 'senha',
            type: 'varchar',
            length: '254',
            isNullable: false,
          },
          {
            name: 'refreshToken',
            type: 'varchar',
            length: '254',
            isNullable: true,
          },
          {
            name: 'dataNascimento',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'rg',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tipoPessoa',
            type: 'varchar',
            length: '2',
            isNullable: false,
            default: "'PF'",
          },
          {
            name: 'cpf',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'cnpj',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'celular',
            type: 'varchar',
            isNullable: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('Usuarios');
  }
}
