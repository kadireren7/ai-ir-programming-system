import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveListOrganizationId } from "@/lib/workspace-scope";
import { isPlainObject } from "@/lib/json-guards";
import { getBuiltInTemplateBySlug } from "@/lib/built-in-policy-templates";

export const runtime = "nodejs";

function toPolicyRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    organizationId: typeof row.organization_id === "string" ? row.organization_id : null,
    name: row.name as string,
    templateSlug: typeof row.template_slug === "string" ? row.template_slug : null,
    config: row.config && typeof row.config === "object" && !Array.isArray(row.config) ? row.config : {},
    enabled: Boolean(row.enabled),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

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

  const organizationId = await resolveListOrganizationId(supabase, user.id);

  let q = supabase
    .from("workspace_policies")
    .select("id,user_id,organization_id,name,template_slug,config,enabled,created_at,updated_at")
    .order("created_at", { ascending: false });

  q = organizationId
    ? q.eq("organization_id", organizationId)
    : q.is("organization_id", null).eq("user_id", user.id);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const policies = (data ?? []).map((r) => toPolicyRow(r as Record<string, unknown>));
  return NextResponse.json({ policies, activeOrganizationId: organizationId });
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const templateSlug =
    typeof body.templateSlug === "string" && body.templateSlug.trim() ? body.templateSlug.trim() : null;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
  const config = isPlainObject(body.config) ? body.config : {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const organizationId = await resolveListOrganizationId(supabase, user.id);

  if (templateSlug) {
    const { data: tpl } = await supabase.from("policy_templates").select("slug").eq("slug", templateSlug).maybeSingle();
    if (!tpl && !getBuiltInTemplateBySlug(templateSlug)) {
      return NextResponse.json({ error: "Unknown template slug" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("workspace_policies")
    .insert({
      user_id: user.id,
      organization_id: organizationId,
      name: name.slice(0, 200),
      template_slug: templateSlug,
      config,
      enabled,
    })
    .select("id,user_id,organization_id,name,template_slug,config,enabled,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ policy: toPolicyRow((data ?? {}) as Record<string, unknown>) });
}
