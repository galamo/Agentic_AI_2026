import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Planner Agent – interprets the user request and produces a structured plan.
 * No skills; sets company name and industry hint for downstream agents/skills.
 */
export class PlannerAgent {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "openai/gpt-4o-mini",
      temperature: 0.2,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey },
    });
    this.name = "PlannerAgent";
  }

  /**
   * @param {Object} state - Graph state with userQuery
   * @returns {Promise<{ plan: object }>}
   */
  async run(state) {
    const query = state.userQuery || "";
    const systemPrompt = `You are a sales operations planner. Given a user request about preparing a proposal or researching a lead, extract:
1. companyName: the company name (or "Unknown" if not given)
2. industryHint: industry or sector if mentioned (e.g. manufacturing, healthcare, tech)
3. steps: a short list of steps we will take, e.g. ["company_research", "lead_qualification", "proposal_draft"]

Reply in this exact JSON only, no other text:
{"companyName":"...","industryHint":"...","steps":["company_research","lead_qualification","proposal_draft"]}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(query || "Prepare a sales proposal for a company."),
    ];
    const response = await this.model.invoke(messages);
    const raw = typeof response.content === "string" ? response.content : String(response.content);
    let plan = { companyName: "Unknown", industryHint: "", steps: ["company_research", "lead_qualification", "proposal_draft"] };
    try {
      const parsed = JSON.parse(raw.replace(/```json?\s*|\s*```/g, "").trim());
      plan = { ...plan, ...parsed };
    } catch (_) {
      // keep default plan
    }
    return { plan };
  }

  getInfo() {
    return { name: this.name, role: "Parse request and produce plan (company, industry, steps)" };
  }
}
