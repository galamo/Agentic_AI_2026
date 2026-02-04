# Lab 2: Multi-Agent House Sale System

A sophisticated multi-agent AI system for analyzing house sales with automatic price estimation and tax calculation using LangGraph.

## 🏗️ Architecture

This system implements a **multi-agent architecture** with three specialized agents:

### 1. **Orchestrator (Supervisor)** 🎯
- **Role**: Single entry point and workflow coordinator
- **Responsibilities**:
  - Parse user requests
  - Break down goals into tasks
  - Assign tasks to specialized agents
  - Merge results from multiple agents
  - Generate comprehensive reports
- **Technology**: LangGraph for state management and workflow orchestration

### 2. **RealEstateAgent** 🏠
- **Role**: Property valuation specialist
- **Responsibilities**:
  - Estimate current market value of properties
  - Analyze location factors (city)
  - Consider property features (number of rooms)
  - Calculate appreciation rates
  - Provide reasoning for estimates

### 3. **TaxAgent** 💰
- **Role**: Tax calculation specialist
- **Responsibilities**:
  - Calculate capital gains tax (25% rate)
  - Apply tax exemptions (first apartment)
  - Compute net proceeds after tax
  - Provide detailed tax breakdowns
  - Explain tax calculations

## 🔄 Workflow

```
User Request
     ↓
Orchestrator (Parse Request)
     ↓
RealEstateAgent (Estimate Price)
     ↓
TaxAgent (Calculate Tax)
     ↓
Orchestrator (Generate Report)
     ↓
Final Result
```

## 📋 Tax Rules

1. **First Apartment**: Exempt from capital gains tax (0% tax)
2. **Second+ Apartment**: Subject to 25% capital gains tax
3. **Tax Calculation**: `(Estimated Price - Buy Price) × 25%`
4. **Net Proceeds**: `Estimated Price - Tax Amount`

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- OpenAI API key

### Installation

1. Navigate to the lab directory:
```bash
cd lab_2_Agent
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_actual_api_key_here
```

### Running the System

Run the example scenarios:
```bash
npm start
```

Or use watch mode for development:
```bash
npm run dev
```

## 💡 Usage Examples

### Example 1: First Apartment (Tax Exempt)
```javascript
const request = `I want to sell my apartment. I bought it for $200,000. 
It has 3 rooms and is located in Tel Aviv. This is my first apartment.`;

const result = await orchestrator.processHouseSale(request);
```

**Expected Output:**
- Estimated Price: ~$260,000 (30% appreciation)
- Tax Amount: $0 (first apartment exemption)
- Net Proceeds: $260,000

### Example 2: Second Apartment (With Tax)
```javascript
const request = `I'm selling my investment property. Purchase price was $300,000.
It's a 4-room apartment in Jerusalem. This is NOT my first apartment.`;

const result = await orchestrator.processHouseSale(request);
```

**Expected Output:**
- Estimated Price: ~$390,000
- Capital Gains: $90,000
- Tax Amount: $22,500 (25% of gains)
- Net Proceeds: $367,500

### Example 3: Compact Request
```javascript
const request = `Sell 2-room apartment in Haifa, bought for $150,000, not first apartment`;

const result = await orchestrator.processHouseSale(request);
```

## 🛠️ Technical Details

### LangGraph Integration

The system uses LangGraph for:
- **State Management**: Maintains workflow state across agent interactions
- **Node Definition**: Each agent task is a graph node
- **Edge Definition**: Defines the flow between tasks
- **Automatic Execution**: Handles sequential task execution

### State Schema
```javascript
{
  userRequest: string,
  propertyDetails: {
    buyPrice: number,
    numberOfRooms: number,
    city: string,
    firstApartment: boolean
  },
  priceEstimation: {
    estimatedPrice: number,
    reasoning: string,
    appreciationRate: string
  },
  taxCalculation: {
    taxAmount: number,
    capitalGains: number,
    netProceeds: number,
    explanation: string
  },
  finalReport: string,
  error: string | null
}
```

## 📁 Project Structure

```
lab_2_Agent/
├── index.js              # Main entry point with examples
├── orchestrator.js       # Orchestrator with LangGraph workflow
├── realEstateAgent.js    # Property valuation agent
├── taxAgent.js           # Tax calculation agent
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
└── README.md            # This file
```

## 🔧 Customization

### Modify Tax Rate
Edit `taxAgent.js`:
```javascript
this.TAX_RATE = 0.25; // Change to desired rate (e.g., 0.30 for 30%)
```

### Add New Agents
1. Create new agent file (e.g., `legalAgent.js`)
2. Add agent to orchestrator
3. Add new node to LangGraph workflow
4. Define edges for agent communication

### Customize Workflow
Edit `orchestrator.js` `buildGraph()` method:
```javascript
workflow.addNode("new_task", this.newTask.bind(this));
workflow.addEdge("calculate_tax", "new_task");
workflow.addEdge("new_task", "generate_report");
```

## 🎯 Key Features

✅ **Multi-Agent Coordination**: Orchestrator manages multiple specialized agents  
✅ **LangGraph Workflow**: State-based workflow management  
✅ **Intelligent Parsing**: Extracts property details from natural language  
✅ **Smart Price Estimation**: AI-powered property valuation  
✅ **Automatic Tax Calculation**: Applies rules and exemptions  
✅ **Comprehensive Reports**: Professional analysis summaries  
✅ **Error Handling**: Graceful error management throughout workflow  

## 📊 Output Format

The system provides:
1. **Property Details**: Parsed information
2. **Price Estimation**: Current market value with reasoning
3. **Tax Breakdown**: Detailed calculation with exemptions
4. **Final Report**: Comprehensive professional summary
5. **Quick Summary**: Key numbers at a glance

## 🤝 Agent Communication

Agents communicate through the orchestrator using LangGraph:
1. Orchestrator receives user request
2. Orchestrator parses request → property details
3. RealEstateAgent receives property details → price estimation
4. TaxAgent receives price + property details → tax calculation
5. Orchestrator merges all results → final report

## 📝 Notes

- All prices are in USD
- Tax rate is fixed at 25% for capital gains
- First apartment exemption is automatic
- System handles missing information with reasonable defaults
- AI models provide explanations for all calculations

## 🐛 Troubleshooting

**Issue**: "OPENAI_API_KEY not found"  
**Solution**: Ensure `.env` file exists with valid API key

**Issue**: Graph execution fails  
**Solution**: Check that all dependencies are installed (`npm install`)

**Issue**: Unexpected tax calculations  
**Solution**: Verify `firstApartment` flag is correctly set

## 📚 Learn More

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Documentation](https://js.langchain.com/)
- [OpenAI API Reference](https://platform.openai.com/docs)

## 🎓 Educational Value

This lab demonstrates:
- Multi-agent system design
- Agent orchestration patterns
- State management with LangGraph
- Task decomposition and delegation
- Agent specialization and coordination
- Real-world business logic implementation

---

**Built with**: Node.js, LangChain, LangGraph, OpenAI GPT-4