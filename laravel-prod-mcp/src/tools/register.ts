import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SshConfig } from "../lib/ssh.js";
import { registerHealthTools } from "./health.js";
import { registerLogTools } from "./logs.js";
import { registerSystemTools } from "./system.js";
import { registerCacheTools } from "./cache.js";
import { registerArtisanTools } from "./artisan.js";
import { registerEnvTools } from "./env.js";
import { registerDatabaseTools } from "./database.js";

export function registerAllTools(
  server: McpServer,
  ssh: SshConfig,
  policy: { enableMutations: boolean },
) {
  registerHealthTools(server, ssh);
  registerLogTools(server, ssh);
  registerSystemTools(server, ssh);
  registerCacheTools(server, ssh);
  registerEnvTools(server, ssh);
  registerDatabaseTools(server, ssh);
  registerArtisanTools(server, ssh, policy);
}
