/**
 * Lab 9 Multi-Agent server: router chooses between HTML RAG and SQL agent.
 * 1. Router Agent: decides html_rag (simple/doc questions) vs sql_agent (database questions)
 * 2a. HTML RAG: retrieve from html_vectors, answer from context
 * 2b. SQL Agent: schema RAG -> generate SQL -> execute -> answer
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { route } from "./agents/router-agent.js";
import { answerWithHtmlRag } from "./agents/html-rag-agent.js";
import { runSqlAgent } from "./agents/sql-agent-pipeline.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/query", async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'question' in body" });
  }

  try {
    const chosenRoute = await route(question);

    if (chosenRoute === "sql_agent") {
      const result = await runSqlAgent(question);
      return res.json({
        route: "sql_agent",
        answer: result.answer,
        sql: result.sql,
        rows: result.rows,
        rowCount: result.rowCount,
        error: result.error,
      });
    }

    // html_rag
    const answer = await answerWithHtmlRag(question);
    return res.json({
      route: "html_rag",
      answer,
      sql: null,
      rows: null,
      rowCount: null,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log("Lab 9 Multi-Agent server on http://localhost:" + PORT));
