import dotenv from "dotenv";
import { Orchestrator } from "./orchestrator.js";

// Load environment variables
dotenv.config();

/**
 * Main entry point for the multi-agent house sale system
 */
async function main() {
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: OPENAI_API_KEY not found in environment variables");
    console.log("Please create a .env file with your OpenAI API key:");
    console.log("OPENAI_API_KEY=your_api_key_here");
    process.exit(1);
  }

  // Initialize orchestrator
  const orchestrator = new Orchestrator(apiKey);

  // Display system information
  console.log("\n" + "=".repeat(60));
  console.log("🏢 MULTI-AGENT HOUSE SALE SYSTEM");
  console.log("=".repeat(60));
  const info = orchestrator.getInfo();
  console.log(`\n📋 ${info.name} - ${info.role}`);
  console.log("\n🔄 Workflow:");
  info.workflow.forEach((step) => console.log(`   ${step}`));
  console.log("\n🤖 Available Agents:");
  info.agents.forEach((agent) => {
    console.log(`   • ${agent.name} - ${agent.role}`);
  });
  console.log("\n" + "=".repeat(60));

  // Example 1: First apartment (tax exempt)
  console.log("\n\n📝 EXAMPLE 1: First Apartment Sale (Tax Exempt)");
  console.log("-".repeat(60));
  const request1 = `I want to sell my apartment. I bought it for $200,000. 
It has 3 rooms and is located in Tel Aviv. This is my first apartment.`;

  const result1 = await orchestrator.processHouseSale(request1);

  if (result1.success) {
    console.log("\n📄 FINAL REPORT:");
    console.log("-".repeat(60));
    console.log(result1.finalReport);
    console.log("\n💡 QUICK SUMMARY:");
    console.log(`   Estimated Price: $${result1.priceEstimation.estimatedPrice.toLocaleString()}`);
    console.log(`   Tax Amount: $${result1.taxCalculation.taxAmount.toLocaleString()}`);
    console.log(`   Net Proceeds: $${result1.taxCalculation.netProceeds.toLocaleString()}`);
  } else {
    console.error("\n❌ Error:", result1.error);
  }

  // Example 2: Second apartment (with tax)
  console.log("\n\n📝 EXAMPLE 2: Second Apartment Sale (With Tax)");
  console.log("-".repeat(60));
  const request2 = `I'm selling my investment property. Purchase price was $300,000.
It's a 4-room apartment in Jerusalem. This is NOT my first apartment.`;

  const result2 = await orchestrator.processHouseSale(request2);

  if (result2.success) {
    console.log("\n📄 FINAL REPORT:");
    console.log("-".repeat(60));
    console.log(result2.finalReport);
    console.log("\n💡 QUICK SUMMARY:");
    console.log(`   Estimated Price: $${result2.priceEstimation.estimatedPrice.toLocaleString()}`);
    console.log(`   Capital Gains: $${result2.taxCalculation.capitalGains.toLocaleString()}`);
    console.log(`   Tax Amount (25%): $${result2.taxCalculation.taxAmount.toLocaleString()}`);
    console.log(`   Net Proceeds: $${result2.taxCalculation.netProceeds.toLocaleString()}`);
  } else {
    console.error("\n❌ Error:", result2.error);
  }

  // Example 3: Compact request
  console.log("\n\n📝 EXAMPLE 3: Compact Request");
  console.log("-".repeat(60));
  const request3 = `Sell 2-room apartment in Haifa, bought for $150,000, not first apartment`;

  const result3 = await orchestrator.processHouseSale(request3);

  if (result3.success) {
    console.log("\n📄 FINAL REPORT:");
    console.log("-".repeat(60));
    console.log(result3.finalReport);
    console.log("\n💡 QUICK SUMMARY:");
    console.log(`   Estimated Price: $${result3.priceEstimation.estimatedPrice.toLocaleString()}`);
    console.log(`   Tax Amount: $${result3.taxCalculation.taxAmount.toLocaleString()}`);
    console.log(`   Net Proceeds: $${result3.taxCalculation.netProceeds.toLocaleString()}`);
  } else {
    console.error("\n❌ Error:", result3.error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ All examples completed!");
  console.log("=".repeat(60) + "\n");
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

