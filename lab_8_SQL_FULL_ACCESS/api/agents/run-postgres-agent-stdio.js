#!/usr/bin/env node
/**
 * Run the PostgreSQL agent (stdio MCP) from the command line.
 * Spawns mcp-server/server-stdio.js as subprocess. Requires OPENAI_API_KEY and DB (docker compose).
 */
import "dotenv/config";
import { runPostgresAgentStdio } from "./postgres_agent_stdio.js";

const question = process.argv.slice(2).join(" ") || "How many users are in the database?";
console.log("Question:", question);
console.log("—".repeat(50));
try {
  const { answer } = await runPostgresAgentStdio(question);
  console.log("Answer:", answer);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
