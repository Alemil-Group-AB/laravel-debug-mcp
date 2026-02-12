import { callRemoteDiag, type SshConfig } from "../lib/ssh.js";
import { redactSecrets } from "../lib/redact.js";

export async function runDiag(ssh: SshConfig, action: string, params?: Record<string, unknown>) {
  const res = await callRemoteDiag(ssh, { action, params });
  const safe = redactSecrets(res.output);
  return { ...res, output: safe };
}

export function asTextResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
