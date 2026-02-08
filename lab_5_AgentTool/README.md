# Lab 5: LangChain Agent with Google Calendar Tool

A Node.js LangChain agent that integrates with Google Calendar API to answer questions about your calendar events and meetings.

## 🎯 Features

- **Natural Language Queries**: Ask questions about your calendar in plain English
- **Google Calendar Integration**: Direct access to your Google Calendar via API
- **Smart Time Parsing**: Understands queries like "today", "this week", "next month"
- **Detailed Event Information**: Returns event titles, times, descriptions, attendees, and locations
- **Comprehensive Documentation**: Every LangChain component is explained with alternatives

## 📋 Prerequisites

- Node.js (v18 or higher)
- Google Cloud Project with Calendar API enabled
- OpenAI API key
- Google OAuth2 credentials

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd lab_5_AgentTool
npm install
```

### 2. Set Up Google Calendar API

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### Step 2: Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted:
   - User Type: External (for testing)
   - Add your email as a test user
4. Application type: "Desktop app" or "Web application"
5. Add authorized redirect URI: `http://localhost:3000/oauth2callback`
6. Download the credentials JSON file

#### Step 3: Get Refresh Token

You need to obtain a refresh token to access the calendar without manual authorization each time.

**Option A: Use Google OAuth2 Playground**

1. Go to [OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In Step 1, find "Calendar API v3" and select:
   - `https://www.googleapis.com/auth/calendar.readonly`
6. Click "Authorize APIs"
7. Sign in with your Google account
8. In Step 2, click "Exchange authorization code for tokens"
9. Copy the "Refresh token"

**Option B: Use a Node.js Script**

Create a temporary file `get-token.js`:

```javascript
import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/oauth2callback'
);

const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

const server = http.createServer(async (req, res) => {
  if (req.url.indexOf('/oauth2callback') > -1) {
    const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
    const code = qs.get('code');
    res.end('Authentication successful! Check your console for the refresh token.');
    server.close();

    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n🎉 Refresh Token:', tokens.refresh_token);
    console.log('\nAdd this to your .env file as GOOGLE_REFRESH_TOKEN\n');
  }
});

server.listen(3000, () => {
  console.log('Opening browser for authentication...');
  open(authUrl);
});
```

Run it:
```bash
node get-token.js
```

### 3. Configure Environment Variables

Create a `.env` file in the `lab_5_AgentTool` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key

# Google Calendar API Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 4. Run the Agent

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

## 💬 Example Queries

The agent can answer questions like:

- "What meetings do I have today?"
- "Show me my schedule for this week"
- "Do I have any meetings about the project tomorrow?"
- "What's on my calendar for next week?"
- "Find all meetings with John this month"

## 🏗️ Architecture

### Main Components

1. **Google Calendar Client**: Authenticates and connects to Google Calendar API
2. **Custom Tool**: `DynamicStructuredTool` that wraps Calendar API calls
3. **LLM**: ChatOpenAI (GPT-4) for natural language understanding
4. **Agent**: OpenAI Functions Agent that decides when to use the tool
5. **Agent Executor**: Orchestrates the agent's execution loop

### Code Structure

```
lab_5_AgentTool/
├── agent.js           # Main agent implementation (all-in-one file)
├── package.json       # Dependencies
├── .env.example       # Environment variables template
├── .env              # Your actual credentials (git-ignored)
└── README.md         # This file
```

## 📚 LangChain Components Explained

### 1. DynamicStructuredTool

Creates a custom tool with structured input/output validation.

**Alternatives:**
- `DynamicTool`: Simpler tool without schema validation
- `StructuredTool`: Class-based approach for complex tools
- `Tool`: Base class for full control

### 2. ChatOpenAI

The language model that powers the agent.

**Alternatives:**
- `ChatAnthropic`: Use Claude models
- `ChatGoogleGenerativeAI`: Use Gemini models
- `ChatOllama`: Use local open-source models
- `AzureChatOpenAI`: Use OpenAI via Azure

### 3. ChatPromptTemplate

Defines the system prompt and conversation structure.

**Alternatives:**
- `PromptTemplate`: For non-chat prompts
- `FewShotPromptTemplate`: Include examples
- `PipelinePromptTemplate`: Compose multiple prompts

### 4. createOpenAIFunctionsAgent

Creates an agent using OpenAI's function calling.

**Alternatives:**
- `createReactAgent`: ReAct pattern (works with any LLM)
- `createStructuredChatAgent`: Structured conversations
- `createOpenAIToolsAgent`: Newer OpenAI tools API
- `createXmlAgent`: For XML-based models

### 5. AgentExecutor

Orchestrates the agent's execution loop.

**Configuration Options:**
- `verbose`: Show reasoning steps
- `maxIterations`: Prevent infinite loops
- `returnIntermediateSteps`: Include all reasoning

## 🔧 Customization

### Modify Queries

Edit the `queries` array in the `main()` function:

```javascript
const queries = [
  "Your custom question here",
  "Another question",
];
```

### Change LLM Model

In `agent.js`, modify the `ChatOpenAI` configuration:

```javascript
const llm = new ChatOpenAI({
  modelName: "gpt-4", // or "gpt-3.5-turbo", "gpt-4-turbo"
  temperature: 0,
});
```

### Add More Tools

Create additional tools and add them to the agent:

```javascript
const tools = [
  googleCalendarTool,
  yourNewTool,
];

const agent = await createOpenAIFunctionsAgent({
  llm,
  tools,
  prompt,
});
```

## 🐛 Troubleshooting

### "Invalid grant" Error

- Your refresh token may have expired
- Regenerate the refresh token using the steps above
- Ensure your OAuth consent screen includes your email as a test user

### "Calendar API has not been used" Error

- Enable the Google Calendar API in your Google Cloud project
- Wait a few minutes for the API to activate

### "Insufficient permissions" Error

- Ensure you authorized the correct scope: `https://www.googleapis.com/auth/calendar.readonly`
- Regenerate your refresh token with the correct scope

### No Events Found

- Check that you have events in your Google Calendar
- Verify the time range in your query
- Try a broader query like "show me all events this month"

## 📖 Additional Resources

- [LangChain Documentation](https://js.langchain.com/docs/)
- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Google OAuth2 Guide](https://developers.google.com/identity/protocols/oauth2)

## 🎓 Learning Points

This lab demonstrates:

1. **Custom Tool Creation**: How to wrap external APIs as LangChain tools
2. **Agent Architecture**: Understanding agent execution flow
3. **Function Calling**: Using OpenAI's function calling for tool selection
4. **API Integration**: Connecting to Google services with OAuth2
5. **Natural Language Processing**: Converting user queries to API calls

## 📝 License

MIT

## 🤝 Contributing

Feel free to submit issues or pull requests to improve this lab!