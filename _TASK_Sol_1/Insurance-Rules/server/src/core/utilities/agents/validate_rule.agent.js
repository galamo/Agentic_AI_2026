const { ChatOpenAI } = require("@langchain/openai");
const { createReadSystemPrompt } = require("../prompts");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");

const createValidateRuleAgent = (apiKey) => {
  const llm = new ChatOpenAI({
    temperature: 0.2,
    model: "openai/gpt-4o-mini",
    configuration: {
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  const safeJsonParse = (text) => {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  };

  const run = async (rule, retriever) => {
    // 1. Retrieve similar rules from vector DB
    const docs = await retriever.invoke(rule);

    const context = docs
      .map((d) => {
        const meta = d.metadata || {};
        return `
RULE_ID: ${meta.rule_id || "unknown"}
ACTION: ${meta.action || "unknown"}
TAGS: ${(meta.tags || []).join(", ")}
CONTENT:
${d.pageContent}
        `.trim();
      })
      .join("\n\n---\n\n");

    // 2. Build system prompt
    const systemPrompt = createReadSystemPrompt;    

    const systemMessage = new SystemMessage(
      `${systemPrompt}

--- CONTEXT RULES ---
${context}

--- END CONTEXT ---`
    );

    // 3. Human input (structured for better reasoning)
    const humanMessage = new HumanMessage({
      content: JSON.stringify({
        rule_to_check: rule,
      }),
    });

    // 4. Call LLM
    const response = await llm.invoke([systemMessage, humanMessage]);

    const content = response?.content?.trim();

    // 5. Parse LLM response safely
    const parsed = safeJsonParse(content);

    if (!parsed) {
      return {
        isExisting: false,
        answer: null,
        reason: "Invalid LLM response format",
        raw: content,
      };
    }

    console.log("LLM RESPONSE:", parsed);

    // 6. Normalize output
    return {
      isExisting: Boolean(parsed.isExisting),
      answer: parsed.answer || null,
      matchedRuleIds: parsed.matchedRuleIds || [],
      reason: parsed.reason || "",
      newRule: parsed.newRule || null,
    };
  };

  return { run };
};

module.exports = createValidateRuleAgent;