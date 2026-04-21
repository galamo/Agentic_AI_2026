## Agentic AI 2026

### Lecture:

- rag on images
- rag db
- MCP: https://model-context-protocol-dz2jt4d.gamma.site/
- Agents: https://gamma.app/docs/AI-Agents-hlgj38btkim0stw

This repository is a playground for experimenting with **agentic AI** patterns and tools in 2026, using Cursor as the primary development environment.

### Getting started

- **Clone the repo**: `git clone <this-repo-url>`
- **Open in Cursor**: Open the folder in Cursor to get AI-assisted development.
- **Install dependencies**: Follow any language- or framework-specific instructions once they are added (for example `npm install` or `pip install -r requirements.txt`).

### Project status

The project is in an early setup phase. As the codebase and architecture evolve, expand this README with:

- **Architecture overview**
- **How to run tests**
- **Deployment / CI details**
- **Agent behaviors and workflows**

# How to run the Labs - labs/lab1-travel-planner

1. in the root folder run `npm i `
2. create .env file inside the relevant folder
3. add the relevant keys

```javascript
OPENROUTER_API_KEY = sk - or - v1 - b8d261bc18XXXXXXXX7cf8;
TAVILY_API_KEY = tvly - dev - b8d261bc18XXXXXXXX7cf8;
```

4. run `node agent.js` from the relevant folder

# Homework 8.2.2026

- Client: Add an option to present the flights Array as cards located at the right side of the page

- New Tool, add new tool to the eco-system, based on the fligts city - get → latitude/longitude of the relevant city
  LangChain Tool (JS) — city → latitude/longitude (Open-Meteo, no key)
  exmple:
  https://geocoding-api.open-meteo.com/v1/search?
  name=Ashdod,Israel&count=1&language=en&format=json

# EX 11.2.2026

- Using the Rest countries API
- https://restcountries.com/
- Create a Tool that will get country name and return the flag svg link image.
- Show the flag in the UI - as icon on the map.
- response from tool r[0].flags.png
- https://restcountries.com/v3.1/name/uae?fields=flags

### How to Run the project

1. run `npm install` in the folders `Agentic_AI_2026/lab_3_Chat_Bot/client` and `Agentic_AI_2026/lab_3_Chat_Bot`
2. run `npm run dev` in the folder `Agentic_AI_2026/lab_3_Chat_Bot`
3. Open browser in `http://localhost:5173`

# Homework 14.2.2026

1. install docker https://docs.docker.com/engine/install/
2. then navigate to db folder: `cd db `
3. run from terminal `docker compose up`
4. open browser and browse to: `http://localhost:5050/browser/`
5. login with the docker componse credentials
6. username: admin@example.com
7. password: admin

# Homework 15.2.2026

- Create A new Folder Project with the following structure
- /agent
  /scripts
  /data

- inside agent folder create agent.js which will answer question about the OAuth documenation guide
- inside scritps create rag-process which will index the file hw_materials/the-modern-guide-to-oauth.pdf as in vector memory
- the rag process will occure on every request inside the memory
- write the code in a way that the RAG injestion process will not be coupled to the request - QandA
- use a what ever model you prefered.
- /data will contain the PDF

Good Luck in the HW!

# Ex 22.2.2026

- Use the Agent instead of the `answer`
- Add an extra information to the pricing.txt file.
- Run the RAG process again, dont forget to cleanup before
- Try it!

# Homework 22.2.2026

- “Local Government Services Agent” (Web-to-RAG + Summaries)

Goal: Build a small RAG corpus from public web pages.

- RAG data sources:
  A city/municipality website: waste disposal, parking permits, opening hours
  Download pages as HTML → convert to text/markdown for example: (https://www.ashdod.muni.il/he-il/%d7%90%d7%aa%d7%a8-%d7%94%d7%a2%d7%99%d7%a8/)
  use chromaDB or pgVector

- Agent tool: new_request_for_goverment(description) , description for exmaple "i would like to schedule an appointment in the city office to pay my bills"
- Agent tool: get_request_status(id)
- Agent Must save the requests in the DB sql.
- Option client that will expose the data

The project must include

- Server ( agents )
- RAG process
- Script to execute the different flows / client

# Ex 4.3.2026

1. Run the MCP server and the agent(mcp client + host)
2. Add new tool to the MCP server
3. Tool will calc tax according to the given salary
4. check the Agent - see if the agent knows how to calc taxes of 2 salaries

# Homework 4.3.2026

1. Create new MCP server using the modulecontextprotocol lib
2. check the api https://www.apicountries.com/
3. select at 5 apis and create tools from them
4. tools
5. resources
6. propmt - optionsl ( for documenation )

# Ex 11.3

1. lab lab_8_SQL_FULL_ACCESS
2. run `docker-compose up -d`
3. run `npm i` in each folder, api and mcp-server
4. try to run the relevant agent with stdio, `node ./api/agents/run-postgres-agent-stdio.js`
5. run in the main folder `npm run init-db`
6. figure out what is the issue and fix it in case there is no response from the mcp server.

# Homework 11.3

- DB management
- GET select - stats
- Data manipulation - AGENT_WRITE_DELETE

- Extend lab_8
- Create an priviliged agent_manager - with the following permissions to the Database:

1. Write
2. Read
3. Delete

- The agent will be able to create user & delete user
- Create agent_stats that will create statistcs on top of the relevant table - audit_login
- Exmple of statistic - how much logged in users we have in the current month

- login - shiran, 1-10
- login success

- user prompt (toggle button) => create me a new user in the system, first name shiran las name oren, password: 1 to 10

ANSWER:
4

1. route
2. SELECT
3. WRITE_DELETE
4. STATS =======> 2

1=>2
1=>4=>2
1=>3
1=>3=>4 X

# Ex 15.3

- Connect your API TOKEN from mermaid into the lab_9_2
- Lunch the MultiAgent system and let mermiad answer which avilable tools exists?
- Create a flow diagram in your account based on the client prompt
- Agent => Agent => MCP Server | tools
- https://mermaid.ai/app/use - get the api key

# Ex 18.3

- reference lab_11_langgraph_py
- add a new node, which will use agent that translate the result
- the result will be translated according the user selected language
- add to the state final_result_translate

# Homework 18.3

- Run lab_15 - make it work, using the new flow with translator
- see image ![alt text](./lab_15_orchestrator_py/image.png)
- Create a multiagent system - book a flight
- create dummy data json - flights
- the system recieves a flight origin and destination and date in plain text
- the agent will pick the most relevant flights and book it
- booking = save the flight in DB, table.

# Ec 25.3

1. Create a AI process to book room
2. use the client in lab_21
3. try to use MCP playright

# Client side Prompt for expenses client

`Create Lab_23

inside lab_23 create Client applicaiton
name: expenses-client
client should be written in React + Typescirpt latest versions.

The application context is expenses client applicaiton
should contain 2 routes, header navigation and nice icon + background image.

route 1 - upload image/reccipe for analyze in backend and then write into DB, if the image uploaded - confirm with success message modal

route 2 - support presenting the expenses in table,
using filters on date, amount, description

amount and description can be input text - free text
date should be filter by date picker
add submit button for the filters

route 2 should contain above the table 2 piecharts
first piechart will aggregate the reciepts by type,
second piechart will agggregate reciepts by month

align the piecharts statistics above the table - centered

Use Material UI design react library,
Add mockup data to the client using the following Entity: Recipe ( amount, date, type, description )
at least 10 reciepts in different months and amount this year.
Dont implement any other backend capabilities
`

# Ex 29.3

1. Run lab_21 + lab_22
2. try it out.
3. Support an MCP flow instead using playwright - fallback if MCP is not working use the playwright.
4. Build MCP for lab_21 tools: get_bookings, book_room
5. Initiate in the graph an mcp client that will use the relevant tools
6. split contexts using login mechanisem - based on the user history - advanced!

# Ex 12.4

1. Lunch n8n workflow
2. Create a workflow in n8n which can summrize shotrly your latest email recieved
3. when trigerring the workflow - connect an agent that will pull - recieve the latest email from your mailbox
4. summarize the email and return it in the chat response

# EX 15-4

1. Create a workflow autmation based on AI for upload recipets and save the details in the Stylesheet ( another option is to use DB)

2. Create another workflow that Send email every hour with the statistics on top of the stylesheet.

3. Create add to the workflow an email approval sender - after the processes ended - an approval email that the data is saved

![Alt text](./n8n_windows/n8n_example.png)



<!--  10 files -->
<!-- 10 results -->

<!-- file => result -->

<!-- file_1 => 200k X - validation >100k  100m^2  -->
<!-- file_2 => 4k X - Jude llm non reasonable price -->
<!-- file_3 => 30k X - human review  -->
<!-- file_4 => 12k V - 9 --> 

