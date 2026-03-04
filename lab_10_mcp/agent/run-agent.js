#!/usr/bin/env node
/**
 * Run the MCP agent from the command line.
 * Prerequisites: MCP server running (npm run start in mcp-server), OPENAI_API_KEY set.
 *
 * Example: node run-agent.js "What kind of tools do you have?"
 */
import "dotenv/config";
import { runMcpAgent } from "./agents/mcp-agent.js";

const LOG_PREFIX = "[Agent]";

const question = process.argv.slice(2).join(" ") || "What kind of tools do you have?";
console.log(`${LOG_PREFIX} Question:`, question);
console.log("—".repeat(50));
try {
  const { answer } = await runMcpAgent(question);
  console.log("Answer:", answer);
} catch (err) {
  console.error(`${LOG_PREFIX} Error:`, err.message);
  if (err.cause?.code === "ECONNREFUSED") {
    console.error("Hint: Start the MCP server: cd ../mcp-server && npm run start");
  }
  process.exit(1);
}
