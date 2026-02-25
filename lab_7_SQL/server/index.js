/**
 * Lab 7 SQL server: multi-agent pipeline.
 * 1. Schema Retriever (RAG) -> schema context
 * 2. SQL Generator -> SQL
 * 3. DB Executor -> rows or error
 * 4. Answer Agent -> natural language
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { retrieveSchemaContext } from "./agents/schema-retriever.js";
import { runQuery } from "./agents/db-executor.js";
import { answer } from "./agents/answer-agent.js";
import { generateSQLWithAgent } from "./agents/sql-agent.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/query", async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'question' in body" });
  }

  const mapAgentToContext = {
    "agent_1": { table: "schemas_vector" }, 
    "agent_2": { table: "html_city_page" }
  }

  try {
    // agent? answer? or ask DB 

    // 1. Schema Retriever (RAG)
    const { schemaContext } = await retrieveSchemaContext(question);

    // 2. SQL Generator
    const { sql } = await generateSQLWithAgent(question, schemaContext);
    if (!sql) {
      return res.json({
        answer: "I couldn't generate a SQL query for that question.",
        sql: null,
        rows: null,
        error: null,
      });
    }

    // 3. DB Executor
    const execution = await runQuery(sql, []);

    // 4. Answer Agent
    const naturalAnswer = await answer(question, execution, sql);

    res.json({
      answer: naturalAnswer,
      sql,
      rows: execution?.rows,
      rowCount:  execution?.rowCount ,
      error: execution?.error
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Lab 7 SQL server on http://localhost:" + PORT));
