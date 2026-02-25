/**
 * PostgreSQL tool implementations for the MCP server.
 */
import { query } from "./lib/db.js";

export async function listSchemas() {
  const result = await query(
    `SELECT schema_name FROM information_schema.schemata
     WHERE schema_name NOT IN ('pg_catalog', 'pg_toast', 'information_schema')
     ORDER BY schema_name`
  );
  return result.rows.map((r) => r.schema_name);
}

export async function listTables(schema) {
  const result = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schema]
  );
  return result.rows.map((r) => r.table_name);
}

export async function describeTable(schema, table) {
  const result = await query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table]
  );
  return result.rows.map((r) => ({
    column_name: r.column_name,
    data_type: r.data_type,
    is_nullable: r.is_nullable,
    column_default: r.column_default,
  }));
}

export async function getCreateTable(schema, table) {
  const cols = await query(
    `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table]
  );
  if (cols.rows.length === 0) {
    return null;
  }
  const pkResult = await query(
    `SELECT a.attname
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     JOIN pg_class c ON c.oid = i.indrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2 AND i.indisprimary AND a.attnum > 0 AND NOT a.attisdropped`,
    [schema, table]
  );
  const pkCols = pkResult.rows.map((r) => r.attname);
  const lines = cols.rows.map((r) => {
    let def = `${r.column_name} ${r.data_type}`;
    if (r.character_maximum_length) def += `(${r.character_maximum_length})`;
    if (r.is_nullable === "NO") def += " NOT NULL";
    if (r.column_default) def += ` DEFAULT ${r.column_default}`;
    return def;
  });
  if (pkCols.length) {
    lines.push(`PRIMARY KEY (${pkCols.join(", ")})`);
  }
  return `CREATE TABLE ${schema}.${table} (\n  ${lines.join(",\n  ")}\n);`;
}

export async function sqlExecute(sql, params = []) {
  const result = await query(sql, Array.isArray(params) ? params : []);
  return {
    rows: result.rows,
    rowCount: result.rowCount,
    command: result.command,
  };
}
