---
name: axios-http-requests
description: Creates and standardizes HTTP requests using Axios in TypeScript, including GET/POST/PUT/DELETE patterns, params, headers, timeouts, and consistent error handling. Use when building API calls, HTTP clients, or integrating REST endpoints with Axios.
---

# Axios HTTP Requests

## Quick Start

When writing Axios requests in TypeScript:

1. Create one shared Axios instance with `baseURL`, `timeout`, and default headers.
2. Type request inputs and response payloads with interfaces or types.
3. Use `params` for query strings and request body for `POST`/`PUT`.
4. Wrap calls in `try/catch` and return consistent error messages.

## Default Client Pattern

```ts
import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function toErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? error.message;
  }
  return "Unexpected error";
}
```

## Request Templates

### GET with params

```ts
type User = { id: string; email: string };

export async function getUsers(page: number): Promise<User[]> {
  try {
    const res = await api.get<User[]>("/users", {
      params: { page },
    });
    return res.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}
```

### POST with typed body

```ts
type CreateUserInput = { email: string; name: string };
type CreateUserResult = { id: string };

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  try {
    const res = await api.post<CreateUserResult>("/users", input);
    return res.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}
```

### PUT update

```ts
type UpdateUserInput = { name?: string };
type UpdateUserResult = { id: string; name: string };

export async function updateUser(id: string, input: UpdateUserInput): Promise<UpdateUserResult> {
  try {
    const res = await api.put<UpdateUserResult>(`/users/${id}`, input);
    return res.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}
```

### DELETE

```ts
export async function deleteUser(id: string): Promise<void> {
  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}
```

## Usage Rules

- Prefer one shared Axios instance instead of ad-hoc calls.
- Keep endpoint paths relative to `baseURL`.
- Type all response payloads and important request inputs.
- Keep request functions focused: request, minimal mapping, standardized errors.

## Expected Output

When applying this skill, produce:

1. A typed shared Axios client.
2. Typed request functions for the needed endpoints.
3. One consistent error-handling helper.
