/**
 * Best-effort redaction. This is NOT perfect and should not be relied on as the only guardrail.
 * We redact on both remote and local side to reduce accidental leakage.
 */
export function redactSecrets(input: string): string {
  let out = input;

  const patterns: Array<[RegExp, string]> = [
    // Laravel APP_KEY
    [/APP_KEY\s*=\s*base64:[A-Za-z0-9+/=]{20,}/g, "APP_KEY=base64:[REDACTED]"],
    [/APP_KEY\s*=\s*[A-Za-z0-9+/=]{20,}/g, "APP_KEY=[REDACTED]"],

    // Common env secrets
    [/(AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|AWS_SESSION_TOKEN)\s*=\s*[^\s]+/g, "$1=[REDACTED]"],
    [/(DATABASE_URL|REDIS_URL|MAIL_URL)\s*=\s*[^\s]+/g, "$1=[REDACTED]"],

    // Password-ish assignments (best-effort)
    [/(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s]+["']?/gi, "$1=[REDACTED]"],

    // Bearer tokens in logs/headers
    [/Authorization:\s*Bearer\s+[A-Za-z0-9\-_\.=]{10,}/gi, "Authorization: Bearer [REDACTED]"],
    [/Bearer\s+[A-Za-z0-9\-_\.=]{10,}/g, "Bearer [REDACTED]"],

    // JWT-ish blobs
    [/\beyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g, "[REDACTED_JWT]"],

    // Long hex tokens
    [/\b[a-f0-9]{32,}\b/gi, "[REDACTED_HEX]"],
  ];

  for (const [re, rep] of patterns) out = out.replace(re, rep);

  return out;
}
