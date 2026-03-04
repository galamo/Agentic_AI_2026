import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Researcher Agent – gathers and summarizes information for a given query.
 * Used as a node in the LangGraph; reads/writes shared state.
 */
export class ResearcherAgent {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      openAIApiKey: apiKey,
    });
    this.name = "ResearcherAgent";
  }

  /**
   * Node function: takes graph state, returns partial state update (researchNotes).
   * @param {Object} state - Graph state with userQuery
   * @returns {Promise<{ researchNotes: string }>}
   */
  async run(state) {
    const query = state.userQuery;
    if (!query || typeof query !== "string") {
      return { researchNotes: "No query provided." };
    }

    const systemPrompt = `You are a research assistant. Given a user question or topic, produce a short, structured set of research notes (bullets or short paragraphs). Be factual and concise. Do not make up sources; focus on key points that would help someone write a clear answer.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Research and summarize key points for: ${query}`),
    ];

    const response = await this.model.invoke(messages);
    const researchNotes = typeof response.content === "string" ? response.content : String(response.content);

    return { researchNotes };
  }

  getInfo() {
    return { name: this.name, role: "Research and summarize" };
  }
}
