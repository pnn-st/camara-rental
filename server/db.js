const { Pool } = require('pg');
require('dotenv').config();

const rawUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, '')
  : null;

const poolConfig = rawUrl
  ? {
      connectionString: rawUrl,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'camera_rental',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
    };

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
