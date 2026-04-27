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
import { readJsonBodyWithByteLimit, SCAN_JSON_BODY_MAX_BYTES } from "@/lib/request-body";
import {
  attachRequestIdHeader,
  jsonDatabaseErrorResponse,
  jsonErrorResponse,
} from "@/lib/api-json-error";
import { getOrCreateRequestId } from "@/lib/api-request-id";
import { isLikelyUuid, isReasonablePolicyTemplateSlug } from "@/lib/policy-input-limits";
import { logStructured } from "@/lib/structured-log";

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
  const requestId = getOrCreateRequestId(request);
  const admin = createAdminClient();
  if (!admin) {
    return jsonErrorResponse(503, "Scan API is temporarily unavailable", requestId, "service_unavailable");
  }

  const apiKeyRaw = extractApiKeyFromRequest(request);
  if (!apiKeyRaw) {
    return jsonErrorResponse(
      401,
      "Missing API key. Send x-api-key or Authorization: Bearer <key>",
      requestId,
      "unauthorized"
    );
  }

  const keyHash = hashApiKey(apiKeyRaw);
  const { data: keyRow, error: keyError } = await admin
    .from("api_keys")
    .select("id,user_id,revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyError) {
    logStructured("warn", "public_scan_api_key_lookup_failed", { requestId });
    return jsonDatabaseErrorResponse(requestId);
  }
  if (!keyRow || keyRow.revoked_at) {
    return jsonErrorResponse(401, "Invalid or revoked API key", requestId, "unauthorized");
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
      metadata: { placeholder: true, requestId },
    });
    const res = jsonErrorResponse(429, "Rate limit exceeded", requestId, "rate_limited");
    res.headers.set("x-ratelimit-limit", String(rateLimit.limit));
    res.headers.set("x-ratelimit-remaining", String(rateLimit.remaining));
    res.headers.set("x-ratelimit-reset", String(rateLimit.resetSeconds));
    return res;
  }

  let statusCode = 200;
  let sourceForLog: ScanSource | null = null;
  let errorCode: string | null = null;
  try {
    const parsed = await readJsonBodyWithByteLimit(request, SCAN_JSON_BODY_MAX_BYTES);
    if (!parsed.ok) {
      statusCode = parsed.status;
      errorCode = parsed.status === 413 ? "payload_too_large" : "invalid_json";
      return jsonErrorResponse(
        parsed.status,
        parsed.message,
        requestId,
        parsed.status === 413 ? "payload_too_large" : "bad_request"
      );
    }
    const body = parsed.value;

    if (!isPlainObject(body)) {
      statusCode = 400;
      errorCode = "invalid_shape";
      return jsonErrorResponse(400, "Request body must be a JSON object", requestId, "bad_request");
    }

    const sourceRaw = body.source;
    const content = body.content;

    if (sourceRaw !== "n8n" && sourceRaw !== "generic") {
      statusCode = 400;
      errorCode = "invalid_source";
      return jsonErrorResponse(400, 'Field "source" must be either "n8n" or "generic"', requestId, "bad_request");
    }
    if (!isPlainObject(content)) {
      statusCode = 400;
      errorCode = "invalid_content";
      return jsonErrorResponse(
        400,
        'Field "content" must be a JSON object (not null or an array)',
        requestId,
        "bad_request"
      );
    }

    const policyTemplateSlug =
      typeof body.policyTemplateSlug === "string" && body.policyTemplateSlug.trim()
        ? body.policyTemplateSlug.trim()
        : null;
    const workspacePolicyId =
      typeof body.workspacePolicyId === "string" && body.workspacePolicyId.trim()
        ? body.workspacePolicyId.trim()
        : null;

    if (workspacePolicyId && !isLikelyUuid(workspacePolicyId)) {
      statusCode = 400;
      errorCode = "invalid_workspace_policy_id";
      return jsonErrorResponse(400, "workspacePolicyId must be a valid UUID", requestId, "bad_request");
    }
    if (policyTemplateSlug && !isReasonablePolicyTemplateSlug(policyTemplateSlug)) {
      statusCode = 400;
      errorCode = "invalid_policy_template_slug";
      return jsonErrorResponse(400, "policyTemplateSlug format is invalid", requestId, "bad_request");
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
        return jsonErrorResponse(e.httpStatus, e.message, requestId, e.code ?? "scan_provider_error");
      }
      throw e;
    }

    try {
      const payload = await provider.scan({ source, content });
      let responsePayload: ScanApiSuccess | typeof payload = payload;
      if (isScanApiSuccess(payload)) {
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
      return attachRequestIdHeader(
        NextResponse.json(responsePayload, {
          headers: {
            "x-ratelimit-limit": String(rateLimit.limit),
            "x-ratelimit-remaining": String(rateLimit.remaining),
            "x-ratelimit-reset": String(rateLimit.resetSeconds),
          },
        }),
        requestId
      );
    } catch (e) {
      if (e instanceof ScanProviderExecutionError) {
        statusCode = e.httpStatus;
        errorCode = e.code ?? null;
        return jsonErrorResponse(e.httpStatus, e.message, requestId, e.code ?? "scan_provider_error");
      }
      throw e;
    }
  } catch (e) {
    statusCode = 500;
    errorCode = "unhandled";
    logStructured("error", "public_scan_unhandled", { requestId, err: String(e) });
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
        metadata: { rateLimitPlaceholder: true, requestId },
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
