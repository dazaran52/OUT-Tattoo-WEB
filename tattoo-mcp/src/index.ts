import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";
import * as dotenv from "dotenv";

import * as fs from "fs";
import * as path from "path";
import * as dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const server = new McpServer({
  name: "tattoo-mcp",
  version: "1.0.0",
});

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 1. Tool: db_execute_sql
server.tool(
  "db_execute_sql",
  {
    query: z.string().describe("The SQL query to execute"),
  },
  async ({ query }) => {
    try {
      if (!process.env.DATABASE_URL) {
        return { content: [{ type: "text", text: "Error: DATABASE_URL is not set in .env" }] };
      }
      const client = await pool.connect();
      try {
        const result = await client.query(query);
        return {
          content: [
            { type: "text", text: JSON.stringify(result.rows, null, 2) }
          ]
        };
      } finally {
        client.release();
      }
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Error executing SQL: ${e.message}` }],
        isError: true,
      };
    }
  }
);

// 2. Tool: auditor_check_rls
server.tool(
  "auditor_check_rls",
  {
    table: z.string().describe("Table name to query"),
    action: z.enum(["SELECT", "INSERT", "UPDATE", "DELETE"]).describe("Action to attempt"),
    user_id: z.string().describe("User ID (UUID) to impersonate via request.jwt.claims"),
    role: z.string().default("authenticated").describe("Role to assume, e.g. 'authenticated' or 'anon'"),
    payload: z.string().optional().describe("JSON string of the payload for INSERT or UPDATE")
  },
  async ({ table, action, user_id, role, payload }) => {
    try {
      const client = await pool.connect();
      try {
        // Begin transaction so we can rollback and not affect live data
        await client.query('BEGIN');
        
        // Set local vars for RLS
        await client.query(`SET LOCAL role = ${role}`);
        const claims = JSON.stringify({ sub: user_id, role: role });
        await client.query(`SET LOCAL request.jwt.claims = '${claims}'`);

        let result;
        if (action === "SELECT") {
          result = await client.query(`SELECT * FROM ${table} LIMIT 5`);
        } else if (action === "INSERT" && payload) {
          const data = JSON.parse(payload);
          const keys = Object.keys(data).join(", ");
          const values = Object.values(data).map((_, i) => `$${i + 1}`).join(", ");
          result = await client.query(`INSERT INTO ${table} (${keys}) VALUES (${values}) RETURNING *`, Object.values(data));
        } else if (action === "UPDATE" && payload) {
          // This is a naive update test, attempting to update all rows visible to the user
          const data = JSON.parse(payload);
          const updates = Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(", ");
          result = await client.query(`UPDATE ${table} SET ${updates} RETURNING *`, Object.values(data));
        } else if (action === "DELETE") {
          result = await client.query(`DELETE FROM ${table} RETURNING *`);
        } else {
          throw new Error("Invalid action or missing payload");
        }

        // Always rollback
        await client.query('ROLLBACK');

        return {
          content: [
            { 
              type: "text", 
              text: `RLS Check successful. Action: ${action}. Rows affected/returned: ${result.rowCount}.\nData:\n${JSON.stringify(result.rows, null, 2)}` 
            }
          ]
        };

      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `RLS blocked the action or SQL error: ${e.message}` }]
      };
    }
  }
);

// 3. Tool: simulator_fire_event
server.tool(
  "simulator_fire_event",
  {
    endpoint: z.string().describe("Local webhook endpoint (e.g., http://localhost:8000/webhook/stripe)"),
    payload: z.string().describe("JSON string representing the webhook payload"),
    headers: z.string().optional().describe("Optional JSON string for headers (e.g. stripe-signature)")
  },
  async ({ endpoint, payload, headers }) => {
    try {
      const parsedHeaders = headers ? JSON.parse(headers) : {};
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...parsedHeaders
        },
        body: payload
      });
      
      const responseText = await response.text();
      return {
        content: [
          { type: "text", text: `Status: ${response.status} ${response.statusText}\nBody: ${responseText}` }
        ]
      };
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Error firing event: ${e.message}` }],
        isError: true,
      };
    }
  }
);

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tattoo MCP Server running on stdio");
}

run().catch(console.error);
