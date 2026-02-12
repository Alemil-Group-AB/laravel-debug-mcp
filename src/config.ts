import dotenv from "dotenv";

dotenv.config({ quiet: true });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optionalInt(name: string): number | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid int for ${name}: ${v}`);
  return Math.floor(n);
}

function optionalString(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  return v;
}

function optionalBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (!v) return defaultValue;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function splitExtraOpts(value?: string): string[] | undefined {
  if (!value) return undefined;
  // Very simple splitter; if you need quoting, prefer setting up ~/.ssh/config instead.
  return value.split(/\s+/).filter(Boolean);
}

export const config = {
  ssh: {
    host: required("LARAVEL_PROD_HOST"),
    user: required("LARAVEL_PROD_USER"),
    keyPath: optionalString("LARAVEL_PROD_SSH_KEY"),
    port: optionalInt("LARAVEL_PROD_SSH_PORT"),
    extraOpts: splitExtraOpts(optionalString("LARAVEL_PROD_SSH_EXTRA_OPTS")),
    remoteCommand: optionalString("LARAVEL_PROD_REMOTE_COMMAND") ?? "/usr/local/bin/laravel-diag",
    timeoutSec: optionalInt("LARAVEL_PROD_TOOL_TIMEOUT_SEC") ?? 45,
    maxOutputChars: optionalInt("LARAVEL_PROD_MAX_OUTPUT_CHARS") ?? 200_000,
  },
  policy: {
    enableMutations: optionalBool("LARAVEL_PROD_ENABLE_MUTATIONS", false),
  },
};
