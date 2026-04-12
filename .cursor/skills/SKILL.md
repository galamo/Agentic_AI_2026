---
name: axios-http-requests
description: Uses the axios library for HTTP calls from JavaScript or TypeScript in React clients or Node.js. Use when implementing API clients, fetch-like requests, REST calls, or any code that performs HTTP from React components, hooks, or Node scripts—prefer axios over fetch, node-fetch, or request unless the user explicitly asks otherwise.
---

# HTTP requests with axios (React & Node.js)

## When this applies

Use **axios** for outbound HTTP in:

- Browser React apps (components, hooks, utilities)
- Node.js scripts and servers

Do **not** default to `fetch`, `node-fetch`, or deprecated `request` unless the user specifies one of those.

## Setup

Install in the relevant package (app or workspace root):

```bash
npm i axios
```

For TypeScript projects, types ship with axios; no separate `@types/axios` install is needed.

## Import

**ES modules (typical React / modern Node):**

```javascript
import axios from "axios";
```

**CommonJS (legacy Node):**

```javascript
const axios = require("axios");
```

## Usage patterns

**GET**

```javascript
const { data } = await axios.get("https://api.example.com/resource", {
  params: { q: "search" },
});
```

**POST / PUT / PATCH**

```javascript
const { data } = await axios.post("https://api.example.com/resource", payload, {
  headers: { "Content-Type": "application/json" },
});
```

**Shared client (optional, for base URL and defaults)**

```javascript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL ?? "http://localhost:3000",
  timeout: 10_000,
});
```

## Error handling

Axios throws on non-2xx responses. Wrap calls in `try/catch` or use `.catch()`; inspect `error.response?.status`, `error.response?.data`, and `error.code` for network issues.

## Exceptions

If the codebase already standardizes on `fetch` or another client, match the existing pattern. If the user asks for a specific library, follow that instruction.
