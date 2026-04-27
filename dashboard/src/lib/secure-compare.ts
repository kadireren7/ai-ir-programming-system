import { timingSafeEqual } from "node:crypto";

const MAX_SECRET_COMPARE_CHARS = 2048;

/** Constant-time string compare for secrets of equal length; otherwise returns false. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length > MAX_SECRET_COMPARE_CHARS || b.length > MAX_SECRET_COMPARE_CHARS) return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}
