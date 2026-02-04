import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RealEstateAgent } from "./realEstateAgent.js";
import { TaxAgent } from "./taxAgent.js";

/**
 * Orchestrator (Supervisor) - Coordinates the multi-agent workflow
 * Uses LangGraph to manage state and agent communication
 */
export class Orchestrator {
  constructor(apiKey) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      openAIApiKey: apiKey,
    });
    this.realEstateAgent = new RealEstateAgent(apiKey);
    this.taxAgent = new TaxAgent(apiKey);
    this.name = "Orchestrator";
    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph workflow
   */
  buildGraph() {
    // Define the state schema
    const graphState = {
      userRequest: null,
      propertyDetails: null,
      priceEstimation: null,
      taxCalculation: null,
      finalReport: null,
      error: null,
    };

    // Create the graph
    const workflow = new StateGraph({
      channels: graphState,
    });

    // Add nodes (agent tasks)
    workflow.addNode("parse_request", this.parseRequest.bind(this));
    workflow.addNode("estimate_price", this.estimatePrice.bind(this));
    workflow.addNode("calculate_tax", this.calculateTax.bind(this));
    workflow.addNode("generate_report", this.generateReport.bind(this));

    // Define edges (workflow flow)
    workflow.addEdge("__start__", "parse_request");
    workflow.addEdge("parse_request", "estimate_price");
    workflow.addEdge("estimate_price", "calculate_tax");
    workflow.addEdge("calculate_tax", "generate_report");
    workflow.addEdge("generate_report", END);

    return workflow.compile();
  }

  /**
   * Node 1: Parse user request and extract property details
   */
  async parseRequest(state) {
    console.log("\n🎯 Orchestrator: Parsing user request...");

    const systemPrompt = `You are a request parser for a real estate system.
Extract property details from the user's request and return them in JSON format.

Required fields:
- buyPrice: number (original purchase price in USD)
- numberOfRooms: number
- city: string
- firstApartment: boolean

If any information is missing, make reasonable assumptions or use defaults.

Return ONLY a JSON object with these fields, no additional text.`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(state.userRequest),
      ];

      const response = await this.model.invoke(messages);
      const content = response.content;

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const propertyDetails = JSON.parse(jsonMatch[0]);
        console.log("✅ Property details extracted:", propertyDetails);
        return { ...state, propertyDetails };
      }

      throw new Error("Failed to parse property details from request");
    } catch (error) {
      console.error("❌ Parse request error:", error);
      return { ...state, error: error.message };
    }
  }

  /**
   * Node 2: Call RealEstateAgent to estimate property price
   */
  async estimatePrice(state) {
    console.log("\n🏠 Orchestrator: Requesting price estimation from RealEstateAgent...");

    try {
      const priceEstimation = await this.realEstateAgent.estimatePrice(
        state.propertyDetails
      );
      console.log("✅ Price estimation received:", {
        estimatedPrice: priceEstimation.estimatedPrice,
        appreciationRate: priceEstimation.appreciationRate,
      });
      return { ...state, priceEstimation };
    } catch (error) {
      console.error("❌ Price estimation error:", error);
      return { ...state, error: error.message };
    }
  }

  /**
   * Node 3: Call TaxAgent to calculate taxes
   */
  async calculateTax(state) {
    console.log("\n💰 Orchestrator: Requesting tax calculation from TaxAgent...");

    try {
      const saleDetails = {
        estimatedPrice: state.priceEstimation.estimatedPrice,
        buyPrice: state.propertyDetails.buyPrice,
        firstApartment: state.propertyDetails.firstApartment,
        city: state.propertyDetails.city,
      };

      const taxCalculation = await this.taxAgent.calculateTax(saleDetails);
      console.log("✅ Tax calculation received:", {
        taxAmount: taxCalculation.taxAmount,
        netProceeds: taxCalculation.netProceeds,
      });
      return { ...state, taxCalculation };
    } catch (error) {
      console.error("❌ Tax calculation error:", error);
      return { ...state, error: error.message };
    }
  }

  /**
   * Node 4: Generate final comprehensive report
   */
  async generateReport(state) {
    console.log("\n📊 Orchestrator: Generating final report...");

    const systemPrompt = `You are a professional real estate advisor.
Create a comprehensive, well-formatted report summarizing the property sale analysis.

Include:
1. Property overview
2. Price estimation details
3. Tax calculation breakdown
4. Net proceeds summary
5. Key recommendations

Make it clear, professional, and easy to understand.`;

    const userPrompt = `Generate a comprehensive report based on this data:

PROPERTY DETAILS:
${JSON.stringify(state.propertyDetails, null, 2)}

PRICE ESTIMATION:
${JSON.stringify(state.priceEstimation, null, 2)}

TAX CALCULATION:
${JSON.stringify(state.taxCalculation, null, 2)}

Create a professional report.`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await this.model.invoke(messages);
      const finalReport = response.content;

      console.log("✅ Final report generated");
      return { ...state, finalReport };
    } catch (error) {
      console.error("❌ Report generation error:", error);
      return { ...state, error: error.message };
    }
  }

  /**
   * Process a house sale request through the multi-agent workflow
   */
  async processHouseSale(userRequest) {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 ORCHESTRATOR: Starting house sale analysis");
    console.log("=".repeat(60));

    try {
      // Initialize state
      const initialState = {
        userRequest,
        propertyDetails: null,
        priceEstimation: null,
        taxCalculation: null,
        finalReport: null,
        error: null,
      };

      // Run the graph
      const finalState = await this.graph.invoke(initialState);

      if (finalState.error) {
        throw new Error(finalState.error);
      }

      console.log("\n" + "=".repeat(60));
      console.log("✅ ORCHESTRATOR: Analysis complete");
      console.log("=".repeat(60));

      return {
        success: true,
        propertyDetails: finalState.propertyDetails,
        priceEstimation: finalState.priceEstimation,
        taxCalculation: finalState.taxCalculation,
        finalReport: finalState.finalReport,
      };
    } catch (error) {
      console.error("\n❌ ORCHESTRATOR ERROR:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get orchestrator information
   */
  getInfo() {
    return {
      name: this.name,
      role: "Multi-Agent Supervisor",
      workflow: [
        "1. Parse user request",
        "2. Estimate property price (RealEstateAgent)",
        "3. Calculate taxes (TaxAgent)",
        "4. Generate comprehensive report",
      ],
      agents: [
        this.realEstateAgent.getInfo(),
        this.taxAgent.getInfo(),
      ],
    };
  }
}

