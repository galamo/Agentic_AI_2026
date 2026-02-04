import "dotenv/config";
import express from "express";
import cors from "cors";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize the model
const model = new ChatOpenAI({
  model: "mistralai/mistral-7b-instruct",
  temperature: 0.2,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

// Create the prompt template
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a friendly travel-planning agent. You design 3-day itineraries that balance sightseeing, food, and local culture. Always ask 2 quick clarifying questions if information is missing.",
  ],
  ["human", "{message}"],
]);

const chain = prompt.pipe(model);

// API endpoint for chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, departure, destination, style, budget, interests } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Build the message with parameters if provided
    let fullMessage = message;
    if (departure || destination || style || budget || interests) {
      fullMessage = `Plan a 3-day trip.\n\n`;
      if (departure) fullMessage += `Departure city: ${departure}\n`;
      if (destination) fullMessage += `Destination city: ${destination}\n`;
      if (style) fullMessage += `Travel style: ${style}\n`;
      if (budget) fullMessage += `Budget level: ${budget}\n`;
      if (interests) fullMessage += `Special interests: ${interests}\n`;
      fullMessage += `\nAdditional request: ${message}`;
    }

    const response = await chain.invoke({
      message: fullMessage,
    });

    res.json({
      success: true,
      response: response.content,
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process chat request",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Travel Planner API is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Travel Planner API server running on http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/chat`);
});

