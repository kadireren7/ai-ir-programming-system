import { NextResponse } from "next/server";
import { getScanProvider, ScanProviderExecutionError } from "@/lib/scan/providers";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import type { ScanApiSuccess, ScanSource } from "@/lib/scan-engine";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveScopedOrganizationId } from "@/lib/workspace-scope";
import { dispatchScanNotificationsForUser } from "@/lib/scan-notification-dispatch";
import { isPlainObject } from "@/lib/json-guards";
import { resolveScanPolicy } from "@/lib/resolve-scan-policy";
import { evaluateScanAgainstPolicy } from "@/lib/policy-evaluator";
import { readJsonBodyWithByteLimit, SCAN_JSON_BODY_MAX_BYTES } from "@/lib/request-body";
import { attachRequestIdHeader, jsonErrorResponse } from "@/lib/api-json-error";
import { getOrCreateRequestId } from "@/lib/api-request-id";
import { isLikelyUuid, isReasonablePolicyTemplateSlug } from "@/lib/policy-input-limits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const parsed = await readJsonBodyWithByteLimit(request, SCAN_JSON_BODY_MAX_BYTES);
  if (!parsed.ok) {
    return jsonErrorResponse(
      parsed.status,
      parsed.message,
      requestId,
      parsed.status === 413 ? "payload_too_large" : "bad_request"
    );
  }
  const body = parsed.value;

  if (!isPlainObject(body)) {
    return jsonErrorResponse(400, "Request body must be a JSON object", requestId, "bad_request");
  }

  if (isSupabaseConfigured()) {
    const supabaseAuth = await createClient();
    if (!supabaseAuth) {
      return jsonErrorResponse(503, "Supabase is not configured", requestId, "service_unavailable");
    }
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return jsonErrorResponse(
        401,
        "Sign in to run scans while cloud mode is enabled, or run without Supabase env for local demo.",
        requestId,
        "unauthorized"
      );
    }
  }

  const sourceRaw = body.source;
  const content = body.content;

  const VALID_SOURCES = ["n8n", "generic", "github", "ai-agent"] as const;
  if (!VALID_SOURCES.includes(sourceRaw as (typeof VALID_SOURCES)[number])) {
    return jsonErrorResponse(400, `Field "source" must be one of: ${VALID_SOURCES.join(", ")}`, requestId, "bad_request");
  }

  if (!isPlainObject(content)) {
    return jsonErrorResponse(
      400,
      'Field "content" must be a JSON object (not null or an array)',
      requestId,
      "bad_request"
    );
  }

  const source = sourceRaw as ScanSource;
  const input = { source, content };

  const workspacePolicyId =
    typeof body.workspacePolicyId === "string" && body.workspacePolicyId.trim()
      ? body.workspacePolicyId.trim()
      : null;
  const policyTemplateSlug =
    typeof body.policyTemplateSlug === "string" && body.policyTemplateSlug.trim()
      ? body.policyTemplateSlug.trim()
      : null;

  if (workspacePolicyId && !isLikelyUuid(workspacePolicyId)) {
    return jsonErrorResponse(400, "workspacePolicyId must be a valid UUID", requestId, "bad_request");
  }
  if (policyTemplateSlug && !isReasonablePolicyTemplateSlug(policyTemplateSlug)) {
    return jsonErrorResponse(400, "policyTemplateSlug format is invalid", requestId, "bad_request");
  }

  let provider;
  try {
    provider = getScanProvider();
  } catch (e) {
    if (e instanceof ScanProviderExecutionError) {
      return jsonErrorResponse(
        e.httpStatus,
        e.message,
        requestId,
        e.code ?? "scan_provider_error"
      );
    }
    throw e;
  }

  try {
    const payload = await provider.scan(input);
    if (!isScanApiSuccess(payload)) {
      return attachRequestIdHeader(NextResponse.json(payload), requestId);
    }

    let responsePayload: ScanApiSuccess = payload;
    if (workspacePolicyId || policyTemplateSlug) {
      const supabase = await createClient();
      const resolved = await resolveScanPolicy(supabase, { workspacePolicyId, policyTemplateSlug });
      if (resolved) {
        responsePayload = {
          ...payload,
          policyEvaluation: evaluateScanAgainstPolicy(payload, resolved.name, resolved.config),
        };
      }
    }

    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const organizationId = await resolveScopedOrganizationId(supabase, user.id);
        void dispatchScanNotificationsForUser(user.id, responsePayload, source, organizationId).catch(() => {});
      }
    }
    return attachRequestIdHeader(NextResponse.json(responsePayload), requestId);
  } catch (e) {
    if (e instanceof ScanProviderExecutionError) {
      return jsonErrorResponse(e.httpStatus, e.message, requestId, e.code ?? "scan_provider_error");
    }
    throw e;
  }
}
