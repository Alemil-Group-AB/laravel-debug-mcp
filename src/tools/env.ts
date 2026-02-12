import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SshConfig } from "../lib/ssh.js";
import { asTextResult, runDiag } from "./util.js";

export function registerEnvTools(server: McpServer, ssh: SshConfig) {
  server.registerTool(
    "file_list",
    {
      description:
        "List files/directories under Laravel app root. Use optional relative `path`, recursive mode, and output cap.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .max(512)
          .optional()
          .describe("Relative path under app root (default `.`)."),
        recursive: z.boolean().optional().default(false),
        maxEntries: z.number().int().min(1).max(1000).default(300),
      },
    },
    async ({ path, recursive, maxEntries }) =>
      asTextResult((await runDiag(ssh, "file.list", { path, recursive, maxEntries })).output),
  );

  server.registerTool(
    "file_read",
    {
      description:
        "Read any file under Laravel app root. Use a relative path like `app/Models/User.php` or `.env`.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .max(512)
          .describe("Relative path under app root (e.g. `config/app.php`, `routes/web.php`)."),
      },
    },
    async ({ path }) => asTextResult((await runDiag(ssh, "file.read", { path })).output),
  );

  server.registerTool(
    "env_read",
    {
      description:
        "Read a Laravel app `.env*` file from app root (default `.env`). Output is best-effort redacted.",
      inputSchema: {
        file: z
          .string()
          .min(4)
          .max(64)
          .optional()
          .describe("Optional `.env*` basename (e.g. `.env`, `.env.production`, `.env.staging`)."),
      },
    },
    async ({ file }) => asTextResult((await runDiag(ssh, "env.read", { file })).output),
  );
}
