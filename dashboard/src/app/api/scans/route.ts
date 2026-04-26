import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import type { ScanSource } from "@/lib/scan-engine";

export const runtime = "nodejs";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const source = body.source;
  const result = body.result;
  const workflowName = body.workflowName;

  if (source !== "n8n" && source !== "generic") {
    return NextResponse.json({ error: 'Field "source" must be "n8n" or "generic"' }, { status: 400 });
  }

  if (!isScanApiSuccess(result)) {
    return NextResponse.json({ error: 'Field "result" must match server scan payload' }, { status: 400 });
  }

  if (workflowName !== undefined && workflowName !== null && typeof workflowName !== "string") {
    return NextResponse.json({ error: 'Field "workflowName" must be a string when provided' }, { status: 400 });
  }

  const name =
    typeof workflowName === "string" && workflowName.trim().length > 0
      ? workflowName.trim().slice(0, 512)
      : null;

  const { data, error } = await supabase
    .from("scan_history")
    .insert({
      user_id: user.id,
      source: source as ScanSource,
      workflow_name: name,
      result,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id as string });
}
