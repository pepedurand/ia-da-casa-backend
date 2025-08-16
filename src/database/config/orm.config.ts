import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const getOrmConfig = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.SUPABASE_HOST,
  port: Number(process.env.SUPABASE_PORT ?? 5432),
  username: process.env.SUPABASE_USER,
  password: process.env.SUPABASE_PASSWORD,
  database: process.env.SUPABASE_DB,
  entities: ['src/**/*.entity.{ts,js}'],
  migrations: ['src/database/migrations/*.{ts,js}'],
  synchronize: false,
  ssl:
    String(process.env.SUPABASE_SSL ?? 'true').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false,
  migrationsTableName:
    process.env.TYPEORM_MIGRATIONS_TABLE ?? 'typeorm_migrations',
});

const makeDataSource = () => new DataSource(getOrmConfig());

export default makeDataSource;
