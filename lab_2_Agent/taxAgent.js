import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Tax Agent - Calculates capital gains tax on property sales
 */
export class TaxAgent {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: apiKey,
    });
    this.name = "TaxAgent";
    this.TAX_RATE = 0.25; // 25% capital gains tax
  }

  /**
   * Calculate capital gains tax on property sale
   * @param {Object} saleDetails - Sale information
   * @param {number} saleDetails.estimatedPrice - Current estimated price
   * @param {number} saleDetails.buyPrice - Original purchase price
   * @param {boolean} saleDetails.firstApartment - Is this a first apartment?
   * @param {string} saleDetails.city - City location
   * @returns {Promise<Object>} Tax calculation and details
   */
  async calculateTax(saleDetails) {
    const { estimatedPrice, buyPrice, firstApartment, city } = saleDetails;

    // First apartment is exempt from capital gains tax
    if (firstApartment) {
      return {
        agent: this.name,
        taxAmount: 0,
        capitalGains: estimatedPrice - buyPrice,
        taxRate: 0,
        exemptionReason: "First apartment - exempt from capital gains tax",
        netProceeds: estimatedPrice,
        breakdown: {
          estimatedPrice,
          buyPrice,
          capitalGains: estimatedPrice - buyPrice,
          taxAmount: 0,
          netProceeds: estimatedPrice,
        },
      };
    }

    // Calculate capital gains
    const capitalGains = estimatedPrice - buyPrice;

    // Only pay tax if there's a profit
    if (capitalGains <= 0) {
      return {
        agent: this.name,
        taxAmount: 0,
        capitalGains,
        taxRate: 0,
        exemptionReason:
          "No capital gains - property sold at loss or break-even",
        netProceeds: estimatedPrice,
        breakdown: {
          estimatedPrice,
          buyPrice,
          capitalGains,
          taxAmount: 0,
          netProceeds: estimatedPrice,
        },
      };
    }

    // Calculate tax (25% of capital gains)
    const taxAmount = capitalGains * this.TAX_RATE;
    const netProceeds = estimatedPrice - taxAmount;

    // Get AI explanation for the tax calculation
    const systemPrompt = `You are a tax expert specializing in real estate capital gains tax.
Explain the tax calculation in a clear, professional manner.
Keep your explanation concise (2-3 sentences).`;

    const userPrompt = `Explain this capital gains tax calculation:
- Property sold for: $${estimatedPrice.toLocaleString()}
- Original purchase price: $${buyPrice.toLocaleString()}
- Capital gains: $${capitalGains.toLocaleString()}
- Tax rate: ${this.TAX_RATE * 100}%
- Tax amount: $${taxAmount.toLocaleString()}
- Net proceeds: $${netProceeds.toLocaleString()}
- Location: ${city}`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await this.model.invoke(messages);
      const explanation = response.content;

      return {
        agent: this.name,
        taxAmount: Math.round(taxAmount * 100) / 100,
        capitalGains: Math.round(capitalGains * 100) / 100,
        taxRate: this.TAX_RATE,
        netProceeds: Math.round(netProceeds * 100) / 100,
        explanation,
        breakdown: {
          estimatedPrice,
          buyPrice,
          capitalGains: Math.round(capitalGains * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100,
          netProceeds: Math.round(netProceeds * 100) / 100,
        },
      };
    } catch (error) {
      console.error("TaxAgent error:", error);
      // Return calculation even if AI explanation fails
      return {
        agent: this.name,
        taxAmount: Math.round(taxAmount * 100) / 100,
        capitalGains: Math.round(capitalGains * 100) / 100,
        taxRate: this.TAX_RATE,
        netProceeds: Math.round(netProceeds * 100) / 100,
        explanation: `Capital gains tax of ${this.TAX_RATE * 100}% applied to profit of $${capitalGains.toLocaleString()}.`,
        breakdown: {
          estimatedPrice,
          buyPrice,
          capitalGains: Math.round(capitalGains * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100,
          netProceeds: Math.round(netProceeds * 100) / 100,
        },
      };
    }
  }

  /**
   * Get agent information
   */
  getInfo() {
    return {
      name: this.name,
      role: "Tax Calculation Specialist",
      capabilities: [
        "Calculate capital gains tax",
        "Apply tax exemptions",
        "Compute net proceeds",
        "Provide tax explanations",
      ],
      taxRate: `${this.TAX_RATE * 100}%`,
    };
  }
}
