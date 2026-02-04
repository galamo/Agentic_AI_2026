import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Real Estate Agent - Estimates property prices based on various factors
 */
export class RealEstateAgent {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      openAIApiKey: apiKey,
    });
    this.name = "RealEstateAgent";
  }

  /**
   * Estimate the price of an apartment based on various factors
   * @param {Object} propertyDetails - Property information
   * @param {number} propertyDetails.buyPrice - Original purchase price
   * @param {number} propertyDetails.numberOfRooms - Number of rooms
   * @param {string} propertyDetails.city - City location
   * @param {boolean} propertyDetails.firstApartment - Is this a first apartment?
   * @returns {Promise<Object>} Estimated price and reasoning
   */
  async estimatePrice(propertyDetails) {
    const { buyPrice, numberOfRooms, city, firstApartment } = propertyDetails;

    const systemPrompt = `You are an expert real estate agent specializing in property valuation.
Your task is to estimate the current market value of an apartment based on the provided details.

Consider the following factors:
- Original purchase price as a baseline
- Number of rooms (more rooms typically increase value)
- City location (major cities have higher prices)
- Market trends and appreciation rates
- Property condition assumptions

Provide a realistic estimated price in USD and explain your reasoning briefly.
Return your response in the following JSON format:
{
  "estimatedPrice": <number>,
  "reasoning": "<brief explanation>",
  "appreciationRate": "<percentage>"
}`;

    const userPrompt = `Please estimate the current market value for this apartment:
- Original Purchase Price: $${buyPrice.toLocaleString()}
- Number of Rooms: ${numberOfRooms}
- City: ${city}
- First Apartment: ${firstApartment ? "Yes" : "No"}

Provide your professional estimate.`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await this.model.invoke(messages);
      const content = response.content;

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          agent: this.name,
          estimatedPrice: result.estimatedPrice,
          reasoning: result.reasoning,
          appreciationRate: result.appreciationRate,
          propertyDetails,
        };
      }

      // Fallback if JSON parsing fails
      return {
        agent: this.name,
        estimatedPrice: buyPrice * 1.3, // Default 30% appreciation
        reasoning: content,
        appreciationRate: "30%",
        propertyDetails,
      };
    } catch (error) {
      console.error("RealEstateAgent error:", error);
      throw new Error(`Failed to estimate property price: ${error.message}`);
    }
  }

  /**
   * Get agent information
   */
  getInfo() {
    return {
      name: this.name,
      role: "Property Valuation Specialist",
      capabilities: [
        "Estimate apartment prices",
        "Analyze market trends",
        "Consider location factors",
        "Evaluate property appreciation",
      ],
    };
  }
}

