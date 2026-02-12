export function truncate(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (maxChars <= 0) return { text: "", truncated: text.length > 0 };
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars) + "\n\n…(truncated)…", truncated: true };
}

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
