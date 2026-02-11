/**
 * LangChain Agent with Google Calendar Tool Integration
 * 
 * This agent demonstrates how to create a custom tool that integrates with Google Calendar API
 * and uses LangChain's agent framework to answer questions about calendar events.
 */

import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { google } from "googleapis";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// ============================================================================
// GOOGLE CALENDAR SETUP
// ============================================================================

/**
 * Initialize Google Calendar API client with OAuth2 credentials
 * This uses the googleapis library to authenticate and interact with Google Calendar
 */
function getGoogleCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Set credentials using refresh token
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ============================================================================
// LANGCHAIN TOOL DEFINITION
// ============================================================================

/**
 * DynamicStructuredTool: Creates a custom tool with structured input/output
 * 
 * ALTERNATIVES:
 * - DynamicTool: Simpler tool without structured schema (for basic string input/output)
 * - StructuredTool: Class-based approach for more complex tools
 * - Tool: Base class for creating custom tools with full control
 * 
 * The tool schema uses Zod for input validation, ensuring type safety
 */
const googleCalendarTool = new DynamicStructuredTool({
  name: "google_calendar_search",
  description: `
    Search and retrieve information from Google Calendar.
    Use this tool to find meetings, events, and appointments.
    You can search by:
    - Date range (e.g., "today", "this week", "next month")
    - Keywords in event titles or descriptions
    - Time periods
    
    The tool returns event details including:
    - Event title/summary
    - Start and end times
    - Description
    - Attendees
    - Location
  `,
  
  // Schema defines the input structure using Zod
  // ALTERNATIVE: Can use JSON Schema directly instead of Zod
  schema: z.object({
    query: z.string().describe("The search query or time period to look for events (e.g., 'today', 'this week', 'meetings about project')"),
    maxResults: z.number().optional().default(10).describe("Maximum number of events to return (default: 10)"),
  }),

  // The actual function that executes when the tool is called
  func: async ({ query, maxResults = 10 }) => {
    try {
      const calendar = getGoogleCalendarClient();
      
      // Parse the query to determine time range
      const timeRange = parseTimeQuery(query);
      
      // Call Google Calendar API to list events
      // API Reference: https://developers.google.com/calendar/api/v3/reference/events/list
      const response = await calendar.events.list({
        calendarId: "primary", // 'primary' refers to the user's main calendar
        timeMin: timeRange.start.toISOString(),
        timeMax: timeRange.end.toISOString(),
        maxResults: maxResults,
        singleEvents: true, // Expand recurring events into individual instances
        orderBy: "startTime", // Sort by start time
        q: extractKeywords(query), // Search query for event text
      });

      const events = response.data.items || [];

      if (events.length === 0) {
        return `No events found for "${query}".`;
      }

      // Format events into a readable string
      const formattedEvents = events.map((event, index) => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        const attendees = event.attendees 
          ? event.attendees.map(a => a.email).join(", ")
          : "No attendees";
        
        return `
Event ${index + 1}:
- Title: ${event.summary || "No title"}
- Start: ${new Date(start).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })}
- End: ${new Date(end).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })}
- Description: ${event.description || "No description"}
- Location: ${event.location || "No location"}
- Attendees: ${attendees}
        `.trim();
      }).join("\n\n");

      return `Found ${events.length} event(s):\n\n${formattedEvents}`;
      
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return `Error accessing calendar: ${error.message}`;
    }
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse natural language time queries into date ranges
 */
function parseTimeQuery(query) {
  const now = new Date();
  const lowerQuery = query.toLowerCase();
  
  // Today
  if (lowerQuery.includes("today")) {
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(now.setHours(23, 59, 59, 999));
    return { start, end };
  }
  
  // Tomorrow
  if (lowerQuery.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end = new Date(tomorrow.setHours(23, 59, 59, 999));
    return { start, end };
  }
  
  // This week
  if (lowerQuery.includes("this week") || lowerQuery.includes("week")) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  
  // Next week
  if (lowerQuery.includes("next week")) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  
  // This month
  if (lowerQuery.includes("this month") || lowerQuery.includes("month")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  
  // Default: next 7 days
  const start = new Date(now.setHours(0, 0, 0, 0));
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

/**
 * Extract keywords from query for calendar search
 */
function extractKeywords(query) {
  // Remove common time-related words to get actual search terms
  const timeWords = ["today", "tomorrow", "week", "month", "next", "this", "my", "show", "get", "find", "list"];
  const words = query.toLowerCase().split(" ");
  const keywords = words.filter(word => !timeWords.includes(word));
  return keywords.join(" ");
}

// ============================================================================
// LANGCHAIN AGENT SETUP
// ============================================================================

/**
 * ChatOpenAI: The language model that powers the agent
 * 
 * ALTERNATIVES:
 * - ChatAnthropic: Use Claude models from Anthropic
 * - ChatGoogleGenerativeAI: Use Google's Gemini models
 * - ChatOllama: Use local open-source models via Ollama
 * - AzureChatOpenAI: Use OpenAI models via Azure
 * 
 * Parameters:
 * - modelName: The specific model to use (gpt-4, gpt-3.5-turbo, etc.)
 * - temperature: Controls randomness (0 = deterministic, 1 = creative)
 */
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini", // ALTERNATIVES: "gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"
  temperature: 0, // Low temperature for consistent, factual responses
  openAIApiKey: process.env.OPENAI_API_KEY,
});

/**
 * ChatPromptTemplate: Defines the system prompt and conversation structure
 * 
 * ALTERNATIVES:
 * - PromptTemplate: For simpler, non-chat prompts
 * - FewShotPromptTemplate: Include examples in the prompt
 * - PipelinePromptTemplate: Compose multiple prompts together
 * 
 * MessagesPlaceholder: Reserves space for dynamic message insertion
 * - "chat_history": For conversation context
 * - "agent_scratchpad": For agent's reasoning steps
 */
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful calendar assistant with access to the user's Google Calendar.
    
Your role is to:
- Answer questions about calendar events and meetings
- Provide clear, concise information about scheduled events
- Help users understand their schedule
- Format dates and times in a user-friendly way

When using the calendar tool:
- Be specific about time ranges in your queries
- Include relevant keywords from the user's question
- Summarize the results in a natural, conversational way

Current date and time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })}
User timezone: Asia/Jerusalem (UTC+2)`,
  ],
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"), // Agent's internal reasoning
]);

/**
 * createOpenAIFunctionsAgent: Creates an agent that can use tools via OpenAI function calling
 * 
 * ALTERNATIVES:
 * - createReactAgent: Uses ReAct (Reasoning + Acting) pattern with any LLM
 * - createStructuredChatAgent: For structured conversations with tools
 * - createOpenAIToolsAgent: Newer OpenAI tools API (similar to functions)
 * - createXmlAgent: For models that work better with XML formatting
 * 
 * This agent type is optimized for OpenAI models and uses function calling
 * to determine when and how to use tools.
 */
const agent = await createOpenAIFunctionsAgent({
  llm,
  tools: [googleCalendarTool],
  prompt,
});

/**
 * AgentExecutor: Orchestrates the agent's execution loop
 * 
 * ALTERNATIVES:
 * - AgentExecutor.fromAgentAndTools(): Alternative constructor
 * - Custom execution loop: Build your own agent executor for full control
 * 
 * Parameters:
 * - agent: The agent to execute
 * - tools: Available tools for the agent
 * - verbose: Enable detailed logging of agent's reasoning
 * - maxIterations: Prevent infinite loops (default: 15)
 * - returnIntermediateSteps: Include reasoning steps in output
 */
const agentExecutor = new AgentExecutor({
  agent,
  tools: [googleCalendarTool],
  verbose: true, // Shows the agent's thought process
  maxIterations: 10, // Maximum number of tool calls
  returnIntermediateSteps: false, // Set to true to see all reasoning steps
});

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Main function to run the agent with example queries
 */
async function main() {
  console.log("🤖 Google Calendar Agent Started!\n");
  console.log("=" .repeat(60));
  
  // Example queries to demonstrate the agent's capabilities
  const queries = [
    "What meetings do I have today?",
    "Show me my schedule for this week",
    "Do I have any meetings about the project tomorrow?",
  ];

  for (const query of queries) {
    console.log(`\n📅 User: ${query}`);
    console.log("-".repeat(60));
    
    try {
      /**
       * invoke(): Executes the agent with the given input
       * 
       * ALTERNATIVES:
       * - stream(): Stream the response token by token
       * - batch(): Process multiple inputs in parallel
       * - call(): Legacy method (deprecated)
       * 
       * The agent will:
       * 1. Analyze the user's question
       * 2. Decide if it needs to use the calendar tool
       * 3. Call the tool with appropriate parameters
       * 4. Process the tool's response
       * 5. Generate a natural language answer
       */
      const result = await agentExecutor.invoke({
        input: query,
      });
      
      console.log(`\n🤖 Agent: ${result.output}\n`);
      console.log("=" .repeat(60));
      
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  }
  
  console.log("\n✅ Agent execution completed!");
  console.log("\nTo ask your own questions, modify the 'queries' array in the main() function.");
}

// Run the agent
main().catch(console.error);


