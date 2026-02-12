import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SshConfig } from "../lib/ssh.js";
import { asTextResult, runDiag } from "./util.js";

export function registerSystemTools(server: McpServer, ssh: SshConfig) {
  server.registerTool(
    "sys_info",
    {
      description: "Basic system info: uname, date, uptime, load, whoami.",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "sys.info")).output),
  );

  server.registerTool(
    "sys_disk",
    {
      description: "Disk usage (df -h).",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "sys.disk")).output),
  );

  server.registerTool(
    "sys_memory",
    {
      description: "Memory usage (free -m or /proc/meminfo).",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "sys.memory")).output),
  );

  server.registerTool(
    "sys_top",
    {
      description: "Top processes (ps snapshot, not interactive).",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "sys.top")).output),
  );

  server.registerTool(
    "php_version",
    {
      description: "Show PHP CLI version.",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "php.version")).output),
  );

  server.registerTool(
    "php_extensions",
    {
      description: "List loaded PHP extensions (php -m).",
      inputSchema: {},
    },
    async () => asTextResult((await runDiag(ssh, "php.extensions")).output),
  );
}
