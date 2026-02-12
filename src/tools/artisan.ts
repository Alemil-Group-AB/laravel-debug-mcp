import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SshConfig } from "../lib/ssh.js";
import { asTextResult, runDiag } from "./util.js";

export function registerArtisanTools(
  server: McpServer,
  ssh: SshConfig,
  policy: { enableMutations: boolean },
) {
  server.registerTool(
    "artisan_about",
    { description: "Run `php artisan about` (safe summary).", inputSchema: {} },
    async () => asTextResult((await runDiag(ssh, "artisan.about")).output),
  );

  server.registerTool(
    "artisan_version",
    { description: "Run `php artisan --version`.", inputSchema: {} },
    async () => asTextResult((await runDiag(ssh, "artisan.version")).output),
  );

  server.registerTool(
    "artisan_migrate_status",
    { description: "Run `php artisan migrate:status`.", inputSchema: {} },
    async () => asTextResult((await runDiag(ssh, "artisan.migrate_status")).output),
  );

  server.registerTool(
    "artisan_schedule_list",
    { description: "Run `php artisan schedule:list`.", inputSchema: {} },
    async () => asTextResult((await runDiag(ssh, "artisan.schedule_list")).output),
  );

  server.registerTool(
    "artisan_queue_failed",
    { description: "Run `php artisan queue:failed`.", inputSchema: {} },
    async () => asTextResult((await runDiag(ssh, "artisan.queue_failed")).output),
  );

  server.registerTool(
    "artisan_horizon_status",
    { description: "Run `php artisan horizon:status` (if Horizon installed).", inputSchema: {} },
    async () => asTextResult((await runDiag(ssh, "artisan.horizon_status")).output),
  );

  // ---- Mutations (disabled by default; "break-glass") ----

  server.registerTool(
    "artisan_optimize_clear",
    {
      description:
        "BREAK-GLASS: Run `php artisan optimize:clear` (clears config, route, view, event, and app caches). Disabled unless LARAVEL_PROD_ENABLE_MUTATIONS=1.",
      inputSchema: {},
    },
    async () => {
      if (!policy.enableMutations) {
        return asTextResult(
          "Refused: mutations are disabled. Set LARAVEL_PROD_ENABLE_MUTATIONS=1 on the MCP server *and* allow this tool in Codex enabled_tools.",
        );
      }
      return asTextResult((await runDiag(ssh, "artisan.optimize_clear")).output);
    },
  );

  server.registerTool(
    "artisan_config_cache",
    {
      description:
        "BREAK-GLASS: Run `php artisan config:cache` (rebuilds cached config). Disabled unless LARAVEL_PROD_ENABLE_MUTATIONS=1.",
      inputSchema: {},
    },
    async () => {
      if (!policy.enableMutations) {
        return asTextResult(
          "Refused: mutations are disabled. Set LARAVEL_PROD_ENABLE_MUTATIONS=1 on the MCP server *and* allow this tool in Codex enabled_tools.",
        );
      }
      return asTextResult((await runDiag(ssh, "artisan.config_cache")).output);
    },
  );

  server.registerTool(
    "artisan_queue_restart",
    {
      description:
        "BREAK-GLASS: Run `php artisan queue:restart` (signals workers to restart after current job). Disabled unless LARAVEL_PROD_ENABLE_MUTATIONS=1.",
      inputSchema: {},
    },
    async () => {
      if (!policy.enableMutations) {
        return asTextResult(
          "Refused: mutations are disabled. Set LARAVEL_PROD_ENABLE_MUTATIONS=1 on the MCP server *and* allow this tool in Codex enabled_tools.",
        );
      }
      return asTextResult((await runDiag(ssh, "artisan.queue_restart")).output);
    },
  );

  server.registerTool(
    "artisan_queue_retry",
    {
      description:
        "BREAK-GLASS: Run `php artisan queue:retry <ids|all>`. Pass `targets` as `all` (default) or a list of failed job IDs separated by spaces/commas. Disabled unless LARAVEL_PROD_ENABLE_MUTATIONS=1.",
      inputSchema: {
        targets: z.string().min(1).max(500).default("all"),
      },
    },
    async ({ targets }) => {
      if (!policy.enableMutations) {
        return asTextResult(
          "Refused: mutations are disabled. Set LARAVEL_PROD_ENABLE_MUTATIONS=1 on the MCP server *and* allow this tool in Codex enabled_tools.",
        );
      }
      return asTextResult((await runDiag(ssh, "artisan.queue_retry", { targets })).output);
    },
  );

  server.registerTool(
    "artisan_pulse_restart",
    {
      description:
        "BREAK-GLASS: Run `php artisan pulse:restart` (if Pulse installed). Disabled unless LARAVEL_PROD_ENABLE_MUTATIONS=1.",
      inputSchema: {},
    },
    async () => {
      if (!policy.enableMutations) {
        return asTextResult(
          "Refused: mutations are disabled. Set LARAVEL_PROD_ENABLE_MUTATIONS=1 on the MCP server *and* allow this tool in Codex enabled_tools.",
        );
      }
      return asTextResult((await runDiag(ssh, "artisan.pulse_restart")).output);
    },
  );
}
