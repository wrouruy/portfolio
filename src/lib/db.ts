import { Pool } from 'pg';

const globalForPg = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool =
  globalForPg.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true, 
    max: 10, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000, 
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

export const query = async (text: string, params?: any[]) => {
  const res = await pool.query(text, params);
  return res;
};