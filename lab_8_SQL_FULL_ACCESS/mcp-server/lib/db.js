/**
 * PostgreSQL pool for MCP server (same defaults as lab_7 / lab_8 docker-compose).
 */
import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: Number(process.env.PG_PORT || "5434"),
  user: process.env.PG_USER || "sso_user",
  password: process.env.PG_PASSWORD || "sso_pass",
  database: process.env.PG_DATABASE || "sso_db",
  max: 10,
});

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
