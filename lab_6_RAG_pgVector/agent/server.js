/**
 * Express API for the QA agent.
 * POST /ask with body { "message": "your question" } → returns { "answer": "..." }
 * GET /health → { "status": "ok" }
 */

import "dotenv/config";
import express from "express";
import { answer } from "./agents/qa-agent.js";

const app = express();
const PORT = Number(process.env.PORT || "3000");

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
const agent =  createQAAgent(6)
app.post("/ask", async (req, res) => {
  const message = req.body?.message;
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      error: "Missing or invalid body. Send JSON: { \"message\": \"your question\" }",
    });
  }

  try {
    const reply = await answer({ message: message.trim(), k: 6 });
    res.json({ answer: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Agent error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`QA agent API listening on http://localhost:${PORT}`);
  console.log("  POST /ask  body: { \"message\": \"your question\" }");
  console.log("  GET  /health");
});
