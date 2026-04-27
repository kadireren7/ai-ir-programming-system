import { randomUUID } from "node:crypto";

const INCOMING_REQUEST_ID_RE = /^[a-zA-Z0-9._-]{8,128}$/;

/**
 * Reuses a caller-provided `x-request-id` when it looks safe; otherwise generates a UUID.
 * Safe IDs are bounded alphanumeric-ish tokens to avoid log/header injection.
 */
export function getOrCreateRequestId(request: Request): string {
  const raw = request.headers.get("x-request-id")?.trim() ?? request.headers.get("X-Request-Id")?.trim() ?? "";
  if (raw && INCOMING_REQUEST_ID_RE.test(raw)) return raw;
  return randomUUID();
}
