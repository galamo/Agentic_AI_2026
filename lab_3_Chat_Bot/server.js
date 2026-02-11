import "dotenv/config";
import express from "express";
import cors from "cors";
import { agent } from "./agent_new.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint for chat – uses agent_new (flight finder + currency exchange)
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

    const result = await agent.invoke({
      messages: [{ role: "user", content: fullMessage }],
    });
    console.log("!!!!!")
    console.log(result)
    console.log("!!!!!")
    const lastMessage = result.messages[result.messages.length - 1];
    const responseContent = typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);
    
    res.json({
      success: true,
      response: JSON.parse(responseContent),
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
  console.log(`H API endpoint: http://localhost:${PORT}/api/health`);
});

