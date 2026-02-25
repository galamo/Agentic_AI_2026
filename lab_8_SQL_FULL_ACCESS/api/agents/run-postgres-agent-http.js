#!/usr/bin/env node
/**
 * Run the PostgreSQL agent (HTTP MCP) from the command line.
 * Prerequisites: MCP server running (npm run start in mcp-server), OPENAI_API_KEY set.
 */
import "dotenv/config";
import { runPostgresAgentHttp } from "./postgres_agent_http.js";

const LOG_PREFIX = "[Agent]";

const question = process.argv.slice(2).join(" ") || "How many tables are in the database?";
console.log(`${LOG_PREFIX} Question:`, question);
console.log("—".repeat(50));
try {
  console.log(`${LOG_PREFIX} Calling runPostgresAgentHttp...`);
  const { answer } = await runPostgresAgentHttp(question);
  console.log(`${LOG_PREFIX} runPostgresAgentHttp returned successfully.`);
  console.log("Answer:", answer);
} catch (err) {
  console.error(`${LOG_PREFIX} Error:`, err.message);
  const body = err.response?.data ?? err.body ?? err.cause?.response?.data;
  if (body && typeof body === "object") {
    console.error("Provider response:", JSON.stringify(body, null, 2));
  }
  if (err.cause?.code === "ECONNREFUSED") {
    console.error("Hint: Start the PostgreSQL MCP server: cd mcp-server && npm run start");
  }
  process.exit(1);
}
