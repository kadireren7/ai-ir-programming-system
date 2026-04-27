import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import { getBuiltInTemplateBySlug } from "@/lib/built-in-policy-templates";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

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

  const { data: existing, error: selErr } = await supabase
    .from("workspace_policies")
    .select("id,name,template_slug,config,enabled")
    .eq("id", id)
    .maybeSingle();

  if (selErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = existing as Record<string, unknown>;
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : (row.name as string);
  const enabled = typeof body.enabled === "boolean" ? body.enabled : (row.enabled as boolean);

  let template_slug: string | null =
    typeof row.template_slug === "string" ? row.template_slug : null;
  if (body.templateSlug !== undefined) {
    if (body.templateSlug === null) {
      template_slug = null;
    } else if (typeof body.templateSlug === "string" && body.templateSlug.trim()) {
      const slug = body.templateSlug.trim();
      const { data: tpl } = await supabase.from("policy_templates").select("slug").eq("slug", slug).maybeSingle();
      if (!tpl && !getBuiltInTemplateBySlug(slug)) {
        return NextResponse.json({ error: "Unknown template slug" }, { status: 400 });
      }
      template_slug = slug;
    }
  }

  const prevConfig =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? { ...(row.config as Record<string, unknown>) }
      : {};
  const nextConfig = isPlainObject(body.config) ? { ...prevConfig, ...body.config } : prevConfig;

  const { data, error } = await supabase
    .from("workspace_policies")
    .update({ name, enabled, template_slug, config: nextConfig })
    .eq("id", id)
    .select("id,user_id,organization_id,name,template_slug,config,enabled,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ policy: toPolicyRow((data ?? {}) as Record<string, unknown>) });
}

export async function DELETE(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

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

  const { error } = await supabase.from("workspace_policies").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
