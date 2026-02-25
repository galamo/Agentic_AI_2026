/**
 * Lab 8 API: PostgreSQL agent with full DB access via MCP (HTTP).
 * POST /query — uses postgres_agent_http (MCP over HTTP).
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { runPostgresAgentHttp } from "./agents/postgres_agent_http.js";
import { runPostgresAgentStdio } from "./agents/postgres_agent_stdio.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/query", async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'question' in body" });
  }

  try {
    const { answer } = await runPostgresAgentHttp(question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/query-stdio", async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'question' in body" });
  }

  try {
    const { answer } = await runPostgresAgentStdio(question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log("Lab 8 API on http://localhost:" + PORT);
  console.log("  POST /query      — PostgreSQL agent (MCP over HTTP)");
  console.log("  POST /query-stdio — PostgreSQL agent (MCP over stdio, spawns mcp-server)");
});
