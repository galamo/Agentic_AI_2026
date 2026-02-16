## Agentic AI 2026

### Lecture:

- rag on images
- rag db
  https://gamma.app/docs/AI-Agents-hlgj38btkim0stw

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

Good Luck!
