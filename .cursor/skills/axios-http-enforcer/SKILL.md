---
name: axios-http-enforcer
description: Standardizes HTTP requests to use Axios across the project and reuse existing Axios instances before creating new ones. Use when adding or refactoring API calls, HTTP requests, REST clients, fetch calls, or endpoints.
---

# Axios HTTP Enforcer

## Purpose

Ensure all project HTTP requests use Axios and share an existing Axios instance whenever possible.

## Rules

1. For any HTTP request work, use Axios instead of `fetch`.
2. Before creating a new client, search for an existing Axios instance with `axios.create(...)`.
3. Reuse the nearest relevant instance in the same app/module when available.
4. Only create a new instance when no suitable one exists for the target app/module.
5. Keep HTTP logic centralized in API/client modules, not scattered across UI components.

## Discovery Workflow

1. Search for Axios usage:
   - `axios.create(`
   - shared API modules such as `src/api`, `services`, or `client` folders
2. Confirm whether an existing instance already has correct `baseURL`, headers, and interceptors.
3. Reuse that instance for `get`, `post`, `put`, `patch`, and `delete` requests.
4. if the existing instance baseUrl is different, create new additional axios instance in the same file you found the first instance, with different baseUrl and reuse it.

## Dependency Check

Before writing Axios-based code, verify Axios is installed in the target Node.js project.

- If `axios` is missing from `node_modules` or `package.json`, install it with:
  - `npm install axios`
- Do not hardcode version numbers; install the latest version through the package manager.

## Existing Instance In This Repository

- `lab_27/client/src/api/index.ts` defines:
  - `const api = axios.create({ baseURL: '/api' });`

Prefer reusing this instance for work inside the `lab_27/client` app.

## Implementation Guidelines

- Replace new `fetch` usage with Axios methods.
- Return `response.data` from API helpers.
- Keep request/response typing close to API functions when TypeScript is used.
- Add minimal error handling appropriate to project patterns.

## Example Pattern

```ts
import api from "./apiClient";

export const fetchItems = () => api.get("/items").then((r) => r.data);
```

## Validation Checklist

- [ ] No new `fetch(` added for HTTP requests.
- [ ] Existing Axios instance reuse was checked first.
- [ ] New Axios instance created only if justified by module boundaries.
- [ ] API calls remain centralized and consistent.

## Code output

- WRITE IN A COMMENT AT TOP OF THE FILE: USED*SKILL*(SKILL_NAME)
