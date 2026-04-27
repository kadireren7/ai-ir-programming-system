import { NextResponse } from "next/server";
import { getScanProvider, ScanProviderExecutionError } from "@/lib/scan/providers";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import type { ScanApiSuccess, ScanSource } from "@/lib/scan-engine";
import { createClient } from "@/lib/supabase/server";
import { resolveScopedOrganizationId } from "@/lib/workspace-scope";
import { dispatchScanNotificationsForUser } from "@/lib/scan-notification-dispatch";
import { isPlainObject } from "@/lib/json-guards";
import { resolveScanPolicy } from "@/lib/resolve-scan-policy";
import { evaluateScanAgainstPolicy } from "@/lib/policy-evaluator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const sourceRaw = body.source;
  const content = body.content;

  if (sourceRaw !== "n8n" && sourceRaw !== "generic") {
    return NextResponse.json(
      { error: 'Field "source" must be either "n8n" or "generic"' },
      { status: 400 }
    );
  }

  if (!isPlainObject(content)) {
    return NextResponse.json(
      { error: 'Field "content" must be a JSON object (not null or an array)' },
      { status: 400 }
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

  let provider;
  try {
    provider = getScanProvider();
  } catch (e) {
    if (e instanceof ScanProviderExecutionError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    throw e;
  }

  try {
    const payload = await provider.scan(input);
    if (!isScanApiSuccess(payload)) {
      return NextResponse.json(payload);
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
    return NextResponse.json(responsePayload);
  } catch (e) {
    if (e instanceof ScanProviderExecutionError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    throw e;
  }
}
