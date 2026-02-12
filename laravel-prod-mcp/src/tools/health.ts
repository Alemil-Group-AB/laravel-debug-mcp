import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SshConfig } from "../lib/ssh.js";
import { asTextResult, runDiag } from "./util.js";

export function registerHealthTools(server: McpServer, ssh: SshConfig) {
  server.registerTool(
    "health",
    {
      description: "Check Laravel's health endpoint (default: http://127.0.0.1/up) from the server.",
      inputSchema: {
        // Allow overriding, but remote runner will restrict this to loopback-only URLs.
        url: z.string().url().optional().describe("Optional health URL (loopback only)."),
      },
    },
    async ({ url }) => {
      const res = await runDiag(ssh, "health", url ? { url } : undefined);
      return asTextResult(res.output);
    },
  );
}
