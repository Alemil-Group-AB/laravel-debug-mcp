import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SshConfig } from "../lib/ssh.js";
import { asTextResult, runDiag } from "./util.js";

export function registerDatabaseTools(server: McpServer, ssh: SshConfig) {
  server.registerTool(
    "database_connections",
    {
      description:
        "List configured Laravel database connection names and identify the default connection.",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "database.connections")).output),
  );

  server.registerTool(
    "database_schema",
    {
      description:
        "Read database schema details for a connection (tables, columns, indexes, foreign keys).",
      inputSchema: {
        database: z
          .string()
          .min(1)
          .max(64)
          .optional()
          .describe("Optional Laravel database connection name."),
        filter: z
          .string()
          .min(1)
          .max(120)
          .optional()
          .describe("Optional case-insensitive table name filter."),
        maxTables: z.number().int().min(1).max(100).default(30),
      },
    },
    async ({ database, filter, maxTables }) =>
      asTextResult((await runDiag(ssh, "database.schema", { database, filter, maxTables })).output),
  );

  server.registerTool(
    "database_query",
    {
      description:
        "Execute a read-only SQL query (SELECT/SHOW/EXPLAIN/DESCRIBE only) against a Laravel DB connection.",
      inputSchema: {
        query: z.string().min(1).max(5000),
        database: z
          .string()
          .min(1)
          .max(64)
          .optional()
          .describe("Optional Laravel database connection name."),
        maxRows: z.number().int().min(1).max(1000).default(200),
      },
    },
    async ({ query, database, maxRows }) =>
      asTextResult((await runDiag(ssh, "database.query", { query, database, maxRows })).output),
  );
}
