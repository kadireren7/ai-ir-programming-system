import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUILT_IN_POLICY_TEMPLATES } from "@/lib/built-in-policy-templates";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ templates: BUILT_IN_POLICY_TEMPLATES, source: "static" });
  }

  const { data, error } = await supabase
    .from("policy_templates")
    .select("slug,name,description,category,built_in,config,created_at,updated_at")
    .order("slug", { ascending: true });

  if (error) {
    return NextResponse.json({ templates: BUILT_IN_POLICY_TEMPLATES, source: "static", warning: error.message });
  }

  const rows = (data ?? []).map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    description: r.description as string,
    category: r.category as string,
    builtIn: Boolean(r.built_in),
    config: typeof r.config === "object" && r.config && !Array.isArray(r.config) ? r.config : {},
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));

  return NextResponse.json({ templates: rows.length ? rows : BUILT_IN_POLICY_TEMPLATES, source: "database" });
}
