import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { runSkill } from "../skills/index.js";

/**
 * Writer Agent – uses the proposal_draft skill for structure, then LLM to fill a personalized proposal.
 * Reads plan, companyResearch, leadQualification; writes proposalDraft to state.
 */
export class WriterAgent {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "openai/gpt-4o-mini",
      temperature: 0.5,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey },
    });
    this.name = "WriterAgent";
  }

  /**
   * @param {Object} state - Graph state with plan, companyResearch, leadQualification
   * @returns {Promise<{ proposalDraft: string }>}
   */
  async run(state) {
    const plan = state.plan || {};
    const companyResearch = state.companyResearch || {};
    const leadQualification = state.leadQualification || {};
    const companyName = plan.companyName || "Valued Client";

    const { template, sections } = await runSkill("proposal_draft", {
      companyName,
      research: companyResearch,
      qualification: leadQualification,
    });

    const systemPrompt = `You are a sales writer. Using the proposal template and sections, write a complete, professional one-pager proposal. Use the company research (summary, industry, pain points, narrative) and lead qualification (score, readiness) to personalize the content. Output the full proposal as markdown.`;
    const userPrompt = `Template and sections:\n${template}\n\nCompany research:\n${JSON.stringify(companyResearch, null, 2)}\n\nQualification:\n${JSON.stringify(leadQualification, null, 2)}\n\nWrite the final proposal.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];
    const response = await this.model.invoke(messages);
    const proposalDraft = typeof response.content === "string" ? response.content : String(response.content);

    return { proposalDraft };
  }

  getInfo() {
    return { name: this.name, role: "Proposal draft (skill: proposal_draft) + LLM personalization" };
  }
}
