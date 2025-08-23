import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CriaTabelaInformacoes1755908491101 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'Informacoes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'kind',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment:
              "Tipo do conteúdo: 'horarios', 'programacao' ou 'informacoes'",
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: false,
            comment:
              'Armazena o array JSON de horarios, programacao ou informacoes',
          },
          {
            name: 'version',
            type: 'int',
            isNullable: false,
            default: 1,
            comment: 'Controle de versão para cada kind',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Índices úteis
    await queryRunner.query(
      `CREATE INDEX "idx_informacoes_kind" ON "Informacoes" ("kind")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_informacoes_updated" ON "Informacoes" ("updatedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('Informacoes');
  }
}
