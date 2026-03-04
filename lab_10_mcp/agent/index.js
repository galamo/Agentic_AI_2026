/**
 * Lab 10 API: Agent that uses MCP over HTTP.
 * POST /chat — send a question (e.g. "What kind of tools do you have?") and get the agent's answer.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { runMcpAgent } from "./agents/mcp-agent.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'question' in body" });
  }

  try {
    const { answer } = await runMcpAgent(question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log("Lab 10 Agent API on http://localhost:" + PORT);
  console.log("  POST /chat — ask the agent (e.g. body: { \"question\": \"What kind of tools do you have?\" })");
});
