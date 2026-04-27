/**
 * Minimal structured logging for API routes (stdout JSON lines).
 * Redacts common secret-bearing keys; does not ship logs to external vendors.
 */

const SENSITIVE_KEY_SUBSTRINGS = [
  "password",
  "secret",
  "token",
  "authorization",
  "apikey",
  "api_key",
  "cookie",
  "webhookurl",
  "webhook_url",
  "bearer",
  "service_role",
  "pepper",
  "key_hash",
  "slack_webhook",
];

function keyLooksSensitive(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_SUBSTRINGS.some((s) => k.includes(s));
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > 10) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 2000) return `${value.slice(0, 64)}…[truncated]`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => redactValue(v, depth + 1));
  }
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let n = 0;
  for (const [key, v] of Object.entries(o)) {
    if (n++ > 100) {
      out._truncatedKeys = true;
      break;
    }
    if (keyLooksSensitive(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redactValue(v, depth + 1);
    }
  }
  return out;
}

export function redactForLog(fields: Record<string, unknown>): Record<string, unknown> {
  return redactValue(fields, 0) as Record<string, unknown>;
}

export type LogLevel = "info" | "warn" | "error";

export function logStructured(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
  const safe = redactForLog(fields);
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...safe,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
