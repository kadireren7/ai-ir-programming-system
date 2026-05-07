import type { AdminLikeClient } from "@/lib/public-api-auth";

export type RateLimitResult =
  | { allowed: true; limit: number; remaining: number; resetSeconds: number }
  | { allowed: false; limit: number; retryAfterSeconds: number };

const WINDOW_SECONDS = 60;

export async function checkApiKeyRateLimit(
  admin: AdminLikeClient,
  apiKeyId: string,
  limitPerMinute = 60
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
  const { count, error } = await (admin as ReturnType<typeof import("@supabase/supabase-js").createClient>)
    .from("api_key_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("created_at", since);

  if (error) {
    return { allowed: true, limit: limitPerMinute, remaining: limitPerMinute, resetSeconds: WINDOW_SECONDS };
  }

  const used = count ?? 0;
  if (used >= limitPerMinute) {
    return { allowed: false, limit: limitPerMinute, retryAfterSeconds: WINDOW_SECONDS };
  }
  return {
    allowed: true,
    limit: limitPerMinute,
    remaining: limitPerMinute - used - 1,
    resetSeconds: WINDOW_SECONDS,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  if (result.allowed) {
    return {
      "x-ratelimit-limit": String(result.limit),
      "x-ratelimit-remaining": String(result.remaining),
      "x-ratelimit-reset": String(result.resetSeconds),
    };
  }
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": "0",
    "retry-after": String(result.retryAfterSeconds),
  };
}
