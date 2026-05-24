// @ts-nocheck — MCP registerTool + Zod inputSchema triggers TS2589 deep instantiation in this project
import type { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { createUser, deleteUser, getUsers } from './store';
import type { CreateUserInput } from './types';

function buildMcpServer() {
  const server = new McpServer({ name: 'lab-33-users', version: '1.0.0' });

  server.registerTool(
    'get_users',
    {
      description: 'GET /users — list all users, optionally filtered by gender',
      inputSchema: {
        gender: z
          .enum(['male', 'female', 'other'])
          .optional()
          .describe('Filter users by gender'),
      },
    },
    async ({ gender }) => ({
      content: [{ type: 'text', text: JSON.stringify(getUsers(gender ? { gender } : undefined), null, 2) }],
    })
  );

  server.registerTool(
    'create_user',
    {
      description: 'POST /user — create a new user',
      inputSchema: {
        name: z.string().min(1).describe('User display name'),
        email: z.string().min(1).describe('User email (must be unique)'),
        gender: z.enum(['male', 'female', 'other']).describe('User gender'),
      },
    },
    async (args) => {
      const result = createUser(args as CreateUserInput);
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result.user, null, 2) }] };
    }
  );

  server.registerTool(
    'delete_user',
    {
      description: 'DELETE /user — remove a user by id',
      inputSchema: {
        id: z.string().min(1).describe('User id to delete'),
      },
    },
    async ({ id }) => {
      const result = deleteUser(id);
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
    }
  );


  server.registerTool(
    'update_user',
    {
      description: 'PUT /user — UPDATE USER BY ID',
      inputSchema: {
        id: z.string().min(1).describe('User id to Update'),
      },
    },
    async ({ id }) => {
      const result = deleteUser(id);
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
    }
  );


  return server;
}

export async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const mcpServer = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
