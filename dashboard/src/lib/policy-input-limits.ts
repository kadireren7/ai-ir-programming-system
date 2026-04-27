import { isPlainObject } from "@/lib/json-guards";

/** Serialized policy `config` JSON must stay under this size (bytes). */
export const MAX_POLICY_CONFIG_JSON_BYTES = 64 * 1024;

export function policyConfigJsonByteLength(config: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(config === undefined ? {} : config), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function assertPolicyConfigSize(config: unknown): { ok: true } | { ok: false; message: string } {
  if (!isPlainObject(config) && config !== undefined && config !== null) {
    return { ok: false, message: "config must be a JSON object" };
  }
  const n = policyConfigJsonByteLength(config);
  if (n > MAX_POLICY_CONFIG_JSON_BYTES) {
    return { ok: false, message: `config exceeds maximum size (${MAX_POLICY_CONFIG_JSON_BYTES} bytes)` };
  }
  return { ok: true };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLikelyUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

const SLUG_MAX = 128;
const SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/i;

export function isReasonablePolicyTemplateSlug(slug: string): boolean {
  const s = slug.trim();
  if (!s || s.length > SLUG_MAX) return false;
  return SLUG_RE.test(s);
}
