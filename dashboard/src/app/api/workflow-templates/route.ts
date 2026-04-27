import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ScanSource } from "@/lib/scan-engine";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import { isPlainObject } from "@/lib/json-guards";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";

type DbRow = {
  id: string;
  name: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export async function GET() {
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

  const activeOrg = await getActiveOrganizationId();
  let listQuery = supabase.from("workflow_templates").select("id, name, source, created_at, updated_at");
  if (activeOrg) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", activeOrg)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) {
      listQuery = listQuery.eq("organization_id", activeOrg);
    } else {
      listQuery = listQuery.is("organization_id", null);
    }
  } else {
    listQuery = listQuery.is("organization_id", null);
  }

  const { data, error } = await listQuery.order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((r: DbRow) => ({
    id: r.id,
    name: r.name,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ items });
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

  const name = body.name;
  const source = body.source;
  const content = body.content;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: 'Field "name" must be a non-empty string' }, { status: 400 });
  }
  if (source !== "n8n" && source !== "generic") {
    return NextResponse.json({ error: 'Field "source" must be "n8n" or "generic"' }, { status: 400 });
  }
  if (!isPlainObject(content)) {
    return NextResponse.json({ error: 'Field "content" must be a JSON object' }, { status: 400 });
  }

  let organizationId: string | null = null;
  const activeOrg = await getActiveOrganizationId();
  if (activeOrg) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", activeOrg)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) organizationId = activeOrg;
  }

  const { data, error } = await supabase
    .from("workflow_templates")
    .insert({
      user_id: user.id,
      name: name.trim().slice(0, 512),
      source: source as ScanSource,
      content,
      organization_id: organizationId,
    })
    .select("id, name, source, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as DbRow;
  await logWorkspaceActivity(supabase, organizationId, "workflow.uploaded", row.id, {
    name: row.name,
    source: row.source,
  });
  await notifyWorkspaceMembers(
    supabase,
    organizationId,
    "Workflow uploaded",
    `A new workflow template "${row.name}" was uploaded.`,
    "info",
    { templateId: row.id, source: row.source }
  );
  return NextResponse.json({
    id: row.id,
    name: row.name,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
