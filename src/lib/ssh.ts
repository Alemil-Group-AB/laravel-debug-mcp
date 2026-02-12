import { spawn } from "node:child_process";
import { normalizeNewlines, truncate } from "./text.js";

export type SshConfig = {
  host: string;
  user: string;
  keyPath?: string;
  port?: number;
  extraOpts?: string[];
  remoteCommand?: string; // e.g. /usr/local/bin/laravel-diag
  timeoutSec: number;
  maxOutputChars: number;
};

export type RemoteRequest = {
  action: string;
  params?: Record<string, unknown>;
};

export type RemoteResponse = {
  ok: boolean;
  output: string;
  meta?: Record<string, unknown>;
};

export class SshError extends Error {
  constructor(message: string, public readonly meta?: Record<string, unknown>) {
    super(message);
    this.name = "SshError";
  }
}

/**
 * Runs the hardened remote diag runner over SSH and exchanges JSON over stdin/stdout.
 *
 * Security notes:
 * - We only ever execute a fixed remote command (remoteCommand), not arbitrary shell commands.
 * - Parameters are sent as JSON via stdin.
 */
export async function callRemoteDiag(cfg: SshConfig, req: RemoteRequest): Promise<RemoteResponse> {
  const args: string[] = [];

  // Safe-ish defaults
  args.push("-o", "BatchMode=yes");
  args.push("-o", "ConnectTimeout=10");
  args.push("-o", "StrictHostKeyChecking=accept-new");
  args.push("-o", "ServerAliveInterval=30");
  args.push("-o", "ServerAliveCountMax=3");

  if (cfg.port) args.push("-p", String(cfg.port));
  if (cfg.keyPath) args.push("-i", cfg.keyPath);
  if (cfg.extraOpts?.length) args.push(...cfg.extraOpts);

  args.push(`${cfg.user}@${cfg.host}`);

  // If you use forced-command in authorized_keys, you can omit remoteCommand entirely.
  if (cfg.remoteCommand && cfg.remoteCommand.trim().length > 0) {
    // `--` ends ssh options (OpenSSH). Everything after is the remote command.
    args.push("--", cfg.remoteCommand);
  }

  const child = spawn("ssh", args, { stdio: ["pipe", "pipe", "pipe"] });

  const json = JSON.stringify(req);

  let stdout = "";
  let stderr = "";

  const killTimer = setTimeout(() => {
    child.kill("SIGKILL");
  }, cfg.timeoutSec * 1000);

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (stdout.length > cfg.maxOutputChars * 2) child.kill("SIGKILL");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    if (stderr.length > cfg.maxOutputChars * 2) child.kill("SIGKILL");
  });

  child.stdin.write(json);
  child.stdin.end();

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(typeof code === "number" ? code : 1));
  }).finally(() => clearTimeout(killTimer));

  stdout = normalizeNewlines(stdout).trim();
  stderr = normalizeNewlines(stderr).trim();

  // Remote runner should output JSON on stdout. If it doesn't, we still return something useful.
  let parsed: any = null;
  if (stdout) {
    try {
      parsed = JSON.parse(stdout);
    } catch {
      // ignore
    }
  }

  if (parsed && typeof parsed === "object" && typeof parsed.ok === "boolean" && typeof parsed.output === "string") {
    const combined = parsed.output + (stderr ? `\n\n[ssh-stderr]\n${stderr}` : "");
    const { text } = truncate(combined, cfg.maxOutputChars);
    return {
      ok: Boolean(parsed.ok) && exitCode === 0,
      output: text,
      meta: {
        ...(parsed.meta ?? {}),
        sshExitCode: exitCode,
      },
    };
  }

  // Fallback: treat stdout/stderr as raw
  const combined = (stdout ? stdout : "") + (stderr ? `\n\n[ssh-stderr]\n${stderr}` : "");
  const { text } = truncate(combined, cfg.maxOutputChars);

  return {
    ok: exitCode === 0,
    output: text || `No output (ssh exit code ${exitCode})`,
    meta: { sshExitCode: exitCode },
  };
}
