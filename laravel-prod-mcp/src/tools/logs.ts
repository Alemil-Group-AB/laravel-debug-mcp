import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SshConfig } from "../lib/ssh.js";
import { asTextResult, runDiag } from "./util.js";

export function registerLogTools(server: McpServer, ssh: SshConfig) {
  server.registerTool(
    "logs_list",
    {
      description: "List available Laravel log files (storage/logs) with size and modified time.",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "logs.list")).output),
  );

  server.registerTool(
    "logs_tail",
    {
      description: "Tail Laravel log file. By default tails the most recently modified log file.",
      inputSchema: {
        file: z.string().min(1).max(128).optional().describe("Optional log file basename (no paths)."),
        lines: z.number().int().min(10).max(2000).default(200),
      },
    },
    async ({ file, lines }) =>
      asTextResult((await runDiag(ssh, "logs.tail", { file, lines })).output),
  );

  server.registerTool(
    "logs_grep",
    {
      description: "Search Laravel log file for a literal string (fixed-string grep).",
      inputSchema: {
        query: z.string().min(1).max(120),
        file: z.string().min(1).max(128).optional().describe("Optional log file basename (no paths)."),
        maxMatches: z.number().int().min(10).max(500).default(200),
        ignoreCase: z.boolean().optional().default(false),
      },
    },
    async ({ query, file, maxMatches, ignoreCase }) =>
      asTextResult((await runDiag(ssh, "logs.grep", { query, file, maxMatches, ignoreCase })).output),
  );

  server.registerTool(
    "logs_last_error",
    {
      description:
        "Heuristic: show the last lines in the log that look like ERROR/CRITICAL/Exception. Good first stop.",
      inputSchema: {
        file: z.string().min(1).max(128).optional().describe("Optional log file basename (no paths)."),
        lines: z.number().int().min(50).max(5000).default(800),
      },
    },
    async ({ file, lines }) =>
      asTextResult((await runDiag(ssh, "logs.last_error", { file, lines })).output),
  );
}
