import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { orgId } = await context.params;
  if (!orgId) {
    return NextResponse.json({ error: "Missing org id" }, { status: 400 });
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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

  const { data, error } = await supabase
    .from("workspace_activity_logs")
    .select("id, actor_user_id, action, target, metadata, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const actorIds = Array.from(new Set((data ?? []).map((r) => r.actor_user_id).filter((x): x is string => typeof x === "string")));
  const actorNameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", actorIds);
    for (const row of actors ?? []) {
      if (typeof row.id === "string" && typeof row.display_name === "string" && row.display_name.trim()) {
        actorNameById.set(row.id, row.display_name.trim());
      }
    }
  }

  return NextResponse.json({
    items: (data ?? []).map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id,
      actorDisplayName: (typeof r.actor_user_id === "string" ? actorNameById.get(r.actor_user_id) : null) ?? null,
      action: r.action,
      target: r.target,
      metadata: r.metadata,
      createdAt: r.created_at,
    })),
  });
}
