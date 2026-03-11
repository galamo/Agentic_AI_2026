import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Writer Agent – turns research notes into a clear, user-facing answer.
 * Used as a node in the LangGraph; reads shared state (userQuery, researchNotes), writes finalAnswer.
 */
export class WriterAgent {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "openai/gpt-4o-mini",
      temperature: 0.5,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey: apiKey },
    });
    this.name = "WriterAgent";
  }

  /**
   * Node function: takes graph state, returns partial state update (finalAnswer).
   * @param {Object} state - Graph state with userQuery and researchNotes
   * @returns {Promise<{ finalAnswer: string }>}
   */
  async run(state) {
    const { userQuery, researchNotes } = state;
    if (!researchNotes) {
      return { finalAnswer: "No research available to write from." };
    }

    const systemPrompt = `You are a writer. Using the research notes provided, write a clear, friendly, and concise answer to the user's question. Do not add made-up facts; stick to the research. Use plain language.`;

    const userPrompt = `User question: ${userQuery || "N/A"}\n\nResearch notes:\n${researchNotes}\n\nWrite the final answer for the user.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await this.model.invoke(messages);
    const finalAnswer = typeof response.content === "string" ? response.content : String(response.content);

    return { finalAnswer };
  }

  getInfo() {
    return { name: this.name, role: "Turn research into a clear answer" };
  }
}
