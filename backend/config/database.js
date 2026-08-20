import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'uriesmooth_voice',
  user: process.env.DB_USER || 'voice_app',
  password: process.env.DB_PASSWORD || 'changeme',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('[DB] Connection pool established');
});

export default pool;

/**
 * Execute a query with automatic parameter handling
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise}
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 80));
    }
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error.message);
    throw error;
  }
};

/**
 * Get a single row
 */
export const getOne = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

/**
 * Get all rows
 */
export const getAll = async (text, params) => {
  const result = await query(text, params);
  return result.rows;
};
