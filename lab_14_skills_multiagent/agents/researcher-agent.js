import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { runSkill } from "../skills/index.js";

/**
 * Research Agent – uses the company_research skill, then enriches with LLM if needed.
 * Writes companyResearch to graph state.
 */
export class ResearcherAgent {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "openai/gpt-4o-mini",
      temperature: 0.3,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey },
    });
    this.name = "ResearcherAgent";
  }

  /**
   * @param {Object} state - Graph state with plan, optionally userQuery
   * @returns {Promise<{ companyResearch: object }>}
   */
  async run(state) {
    const plan = state.plan || {};
    const companyName = plan.companyName || "Unknown";
    const industryHint = plan.industryHint || "";

    const skillResult = await runSkill("company_research", { companyName, industryHint });

    const systemPrompt = `You are a sales researcher. Given structured company research (summary, industry, size, pain points), add one short paragraph of "narrative" that a sales person could use when talking to this prospect. Be concise and professional.`;
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(skillResult, null, 2)),
    ];
    const response = await this.model.invoke(messages);
    const narrative = typeof response.content === "string" ? response.content : String(response.content);

    const companyResearch = {
      ...skillResult,
      narrative: narrative.trim(),
    };
    return { companyResearch };
  }

  getInfo() {
    return { name: this.name, role: "Company research (skill: company_research) + narrative" };
  }
}
