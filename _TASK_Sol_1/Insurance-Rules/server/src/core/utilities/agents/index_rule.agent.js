const { v4: uuidv4 } = require("uuid");
const { Document } = require("@langchain/core/documents");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { ChatOpenAI } = require("@langchain/openai");
const { PGVectorStore } = require("@langchain/community/vectorstores/pgvector");

const createIndexRuleAgent = (apiKey) => {
  // 🔥 LLM for structuring raw rule
  const llm = new ChatOpenAI({
    temperature: 0,
    model: "openai/gpt-4o-mini",
    configuration: {
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  const embeddings = new OpenAIEmbeddings({
    model: "openai/text-embedding-3-small",
    apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  const config = {
    postgresConnectionOptions: {
      type: "postgres",
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT),
      user: process.env.PG_WRITE_USER,
      password: process.env.PG_WRITE_PASSWORD,
      database: process.env.PG_DATABASE,
    },

    tableName: process.env.TABLE_NAME,

    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  };

  // 🧠 AI STRUCTURING PROMPT
  const structureRule = async (ruleText) => {
    const prompt = `
You are a rule structuring engine for insurance underwriting.

Convert the input rule into STRICT JSON.

RULE:
${ruleText}

Return ONLY JSON in this format:

{
  "text": "normalized rule in format: if ... then ...",
  "action": "approve_standard | decline | increase_premium",
  "tags": ["field", "operator_type"]
}

Rules:
- normalize syntax (in_list, in_array, in_range)
- do NOT invent new conditions
- tags must reflect rule domains (geo, vehicle, risk_zone, channel)
- output ONLY JSON, no explanation
`;

    const res = await llm.invoke([
      { role: "system", content: prompt },
      { role: "user", content: ruleText },
    ]);

    try {
      return JSON.parse(res.content);
    } catch (e) {
      console.log("❌ Failed parsing LLM output:", res.content);
      throw new Error("Invalid LLM structure output");
    }
  };

  const buildEmbeddingText = (rule) => {
    return `
RULE: ${rule.id}

IF:
${rule.text}

THEN:
${rule.action}

TAGS:
${rule.tags.join(", ")}
    `.trim();
  };

  const run = async (ruleInput, retriever) => {
    console.log("====================================");
    console.log("🟡 RAW INPUT:");
    console.dir(ruleInput, { depth: null });
    console.log("====================================");

    if (!ruleInput || typeof ruleInput !== "string") {
      throw new Error("Rule input must be a string");
    }

    // 🔥 STEP 1: STRUCTURE RULE USING AI
    const structured = await structureRule(ruleInput);

    console.log("🟢 STRUCTURED RULE:");
    console.dir(structured, { depth: null });
    console.log("====================================");

    // 🔥 STEP 2: SAFE ID GENERATION (NO rXXX EVER)
    const ruleId = `r_${Date.now()}`;
    const dbId = uuidv4();

    const finalRule = {
      id: ruleId,
      text: structured.text,
      action: structured.action,
      tags: structured.tags || [],
    };

    console.log("🟣 FINAL RULE TO INDEX:");
    console.dir(finalRule, { depth: null });
    console.log("====================================");

    // 🔥 STEP 3: VECTOR STORE
    const vectorStore = await PGVectorStore.initialize(
      embeddings,
      config
    );

    const doc = new Document({
      pageContent: buildEmbeddingText(finalRule),
      metadata: {
        doc_type: "rule",
        rule_id: ruleId,
        action: finalRule.action,
        tags: finalRule.tags,
        raw_text: ruleInput,
        created_at: new Date().toISOString(),
      },
    });

    await vectorStore.addDocuments([doc], {
      ids: [dbId],
    });

    await vectorStore.end();

    console.log("✅ INDEXED RULE:", ruleId);

    return {
      answer: `Rule ${ruleId} indexed successfully`,
      rule: finalRule,
      db_id: dbId,
    };
  };

  return { run };
};

module.exports = createIndexRuleAgent;