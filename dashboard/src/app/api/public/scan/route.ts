import { NextResponse } from "next/server";
import { getScanProvider, ScanProviderExecutionError } from "@/lib/scan/providers";
import { extractApiKeyFromRequest, hashApiKey } from "@/lib/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScanApiSuccess, ScanSource } from "@/lib/scan-engine";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import { isPlainObject } from "@/lib/json-guards";
import { dispatchAlertRulesForScanContext } from "@/lib/alert-dispatch";
import { resolveScanPolicy } from "@/lib/resolve-scan-policy";
import { evaluateScanAgainstPolicy } from "@/lib/policy-evaluator";

export const runtime = "nodejs";

function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded?.trim()) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip")?.trim() ?? null;
}

type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetSeconds: number };

async function checkRateLimitPlaceholder(): Promise<RateLimitResult> {
  // Placeholder only; swap this with Upstash Redis / Vercel KV / Edge Config, etc.
  return { allowed: true, limit: 120, remaining: 119, resetSeconds: 60 };
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase service role is not configured for public API key auth" },
      { status: 503 }
    );
  }

  const apiKeyRaw = extractApiKeyFromRequest(request);
  if (!apiKeyRaw) {
    return NextResponse.json(
      { error: "Missing API key. Send x-api-key or Authorization: Bearer <key>" },
      { status: 401 }
    );
  }

  const keyHash = hashApiKey(apiKeyRaw);
  const { data: keyRow, error: keyError } = await admin
    .from("api_keys")
    .select("id,user_id,revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyError) {
    return NextResponse.json({ error: keyError.message }, { status: 500 });
  }
  if (!keyRow || keyRow.revoked_at) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  const rateLimit = await checkRateLimitPlaceholder();
  if (!rateLimit.allowed) {
    await admin.from("api_key_usage_logs").insert({
      api_key_id: keyRow.id,
      user_id: keyRow.user_id,
      endpoint: "/api/public/scan",
      source: null,
      status_code: 429,
      success: false,
      error_code: "rate_limited",
      request_ip: getRequestIp(request),
      metadata: { placeholder: true },
    });
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "x-ratelimit-limit": String(rateLimit.limit),
          "x-ratelimit-remaining": String(rateLimit.remaining),
          "x-ratelimit-reset": String(rateLimit.resetSeconds),
        },
      }
    );
  }

  let statusCode = 200;
  let sourceForLog: ScanSource | null = null;
  let errorCode: string | null = null;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      statusCode = 400;
      errorCode = "invalid_json";
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isPlainObject(body)) {
      statusCode = 400;
      errorCode = "invalid_shape";
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const sourceRaw = body.source;
    const content = body.content;

    if (sourceRaw !== "n8n" && sourceRaw !== "generic") {
      statusCode = 400;
      errorCode = "invalid_source";
      return NextResponse.json(
        { error: 'Field "source" must be either "n8n" or "generic"' },
        { status: 400 }
      );
    }
    if (!isPlainObject(content)) {
      statusCode = 400;
      errorCode = "invalid_content";
      return NextResponse.json(
        { error: 'Field "content" must be a JSON object (not null or an array)' },
        { status: 400 }
      );
    }

    const source = sourceRaw as ScanSource;
    sourceForLog = source;

    let provider;
    try {
      provider = getScanProvider();
    } catch (e) {
      if (e instanceof ScanProviderExecutionError) {
        statusCode = e.httpStatus;
        errorCode = e.code ?? null;
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
      }
      throw e;
    }

    try {
      const payload = await provider.scan({ source, content });
      let responsePayload: ScanApiSuccess | typeof payload = payload;
      if (isScanApiSuccess(payload)) {
        const policyTemplateSlug =
          typeof body.policyTemplateSlug === "string" && body.policyTemplateSlug.trim()
            ? body.policyTemplateSlug.trim()
            : null;
        const workspacePolicyId =
          typeof body.workspacePolicyId === "string" && body.workspacePolicyId.trim()
            ? body.workspacePolicyId.trim()
            : null;
        const resolved = await resolveScanPolicy(admin, {
          workspacePolicyId,
          policyTemplateSlug,
          strictPersonalUserId: keyRow.user_id as string,
        });
        if (resolved) {
          responsePayload = {
            ...payload,
            policyEvaluation: evaluateScanAgainstPolicy(payload, resolved.name, resolved.config),
          };
        }
        void dispatchAlertRulesForScanContext(admin, {
          actorUserId: keyRow.user_id as string,
          organizationId: null,
          result: responsePayload as ScanApiSuccess,
          source,
          via: "api_public_scan",
        }).catch(() => {});
      }
      return NextResponse.json(responsePayload, {
        headers: {
          "x-ratelimit-limit": String(rateLimit.limit),
          "x-ratelimit-remaining": String(rateLimit.remaining),
          "x-ratelimit-reset": String(rateLimit.resetSeconds),
        },
      });
    } catch (e) {
      if (e instanceof ScanProviderExecutionError) {
        statusCode = e.httpStatus;
        errorCode = e.code ?? null;
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
      }
      throw e;
    }
  } catch (e) {
    statusCode = 500;
    errorCode = "unhandled";
    throw e;
  } finally {
    try {
      await admin.from("api_key_usage_logs").insert({
        api_key_id: keyRow.id,
        user_id: keyRow.user_id,
        endpoint: "/api/public/scan",
        source: sourceForLog,
        status_code: statusCode,
        success: statusCode >= 200 && statusCode < 300,
        error_code: errorCode,
        request_ip: getRequestIp(request),
        metadata: { rateLimitPlaceholder: true },
      });
      await admin
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", keyRow.id)
        .is("revoked_at", null);
    } catch {
      // Keep the public scan response path non-blocking on telemetry writes.
    }
  }
}
