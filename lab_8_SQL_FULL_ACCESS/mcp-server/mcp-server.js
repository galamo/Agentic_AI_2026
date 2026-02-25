/**
 * Shared MCP server definition: PostgreSQL tools (list_schemas, list_tables, describe_table, get_create_table, sql_execute).
 * Single instance created at module load; reuse for all connections.
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as tools from "./tools.js";

const LOG_PREFIX = "[MCP]";

const server = new McpServer(
    {
      name: "postgres-mcp",
      version: "1.0.0",
    },
    { capabilities: { tools: { listChanged: true } } }
  );

  server.registerTool(
    "list_schemas",
    {
      title: "List schemas",
      description: "List all user-visible schemas in the PostgreSQL database.",
      inputSchema: {},
    },
    async () => {
      console.log(`${LOG_PREFIX} list_schemas called`);
      const schemas = await tools.listSchemas();
      console.log(`${LOG_PREFIX} list_schemas result: ${Array.isArray(schemas) ? schemas.length : 0} schema(s)`);
      return {
        content: [{ type: "text", text: JSON.stringify(schemas, null, 2) }],
      }
    }
  );

  server.registerTool(
    "list_tables",
    {
      title: "List tables",
      description: "List all tables in the given schema (e.g. public).",
      inputSchema: {
        schema: z.string().describe("Schema name (e.g. public)"),
      },
    },
    async ({ schema }) => {
      console.log(`${LOG_PREFIX} list_tables called schema="${schema}"`);
      const tables = await tools.listTables(schema);
      console.log(`${LOG_PREFIX} list_tables result: ${Array.isArray(tables) ? tables.length : 0} table(s)`, tables);
      return {
        content: [{ type: "text", text: JSON.stringify(tables, null, 2) }],
      }
    }
  );

  server.registerTool(
    "describe_table",
    {
      title: "Describe table",
      description: "Return column names, types, nullable, and default for a table.",
      inputSchema: {
        schema: z.string().describe("Schema name"),
        table: z.string().describe("Table name"),
      },
    },
    async ({ schema, table }) => {
      console.log(`${LOG_PREFIX} describe_table called schema="${schema}" table="${table}"`);
      const desc = await tools.describeTable(schema, table);
      console.log(`${LOG_PREFIX} describe_table result:`, Array.isArray(desc) ? `${desc.length} column(s)` : desc);
      return {
        content: [{ type: "text", text: JSON.stringify(desc, null, 2) }],
      }
    }
  );

  server.registerTool(
    "get_create_table",
    {
      title: "Get CREATE TABLE",
      description: "Return an approximate CREATE TABLE statement for the given table.",
      inputSchema: {
        schema: z.string().describe("Schema name"),
        table: z.string().describe("Table name"),
      },
    },
    async ({ schema, table }) => {
      console.log(`${LOG_PREFIX} get_create_table called schema="${schema}" table="${table}"`);
      const createSql = await tools.getCreateTable(schema, table);
      const text = createSql ?? `Table ${schema}.${table} not found.`;
      console.log(`${LOG_PREFIX} get_create_table result: ${text ? "OK" : "not found"}`);
      return {
        content: [{ type: "text", text }],
      }
    }
  );

  server.registerTool(
    "sql_execute",
    {
      title: "Execute SQL",
      description: "Execute a parameterized SQL statement (SELECT, INSERT, UPDATE, DELETE, etc.). Pass params as a JSON array for $1, $2, ...",
      inputSchema: {
        sql: z.string().describe("SQL statement (use $1, $2, ... for parameters)"),
        params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().nullable().describe("Optional array of parameter values for $1, $2, ..."),
      },
    },
    async ({ sql, params }) => {
      const safeParams = params ?? [];
      console.log(`${LOG_PREFIX} sql_execute called sql="${sql.slice(0, 120)}${sql.length > 120 ? "..." : ""}" params=${JSON.stringify(safeParams)}`);
      const result = await tools.sqlExecute(sql, safeParams);
      console.log(`${LOG_PREFIX} sql_execute result: command=${result.command} rowCount=${result.rowCount}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { rowCount: result.rowCount, command: result.command, rows: result.rows },
              null,
              2
            ),
          },
        ],
      }
    }
  );

export { server };
