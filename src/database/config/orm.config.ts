import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';

dotenv.config();

export const getOrmConfig = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  ssl: false,
  entities: [
    join(__dirname, '..', '..', '**', '*.entity.{ts,js}'),
    join(__dirname, '..', '..', '**', 'entities', '*.{ts,js}'),
  ],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
});

const dataSource = new DataSource(getOrmConfig());
export default dataSource;
