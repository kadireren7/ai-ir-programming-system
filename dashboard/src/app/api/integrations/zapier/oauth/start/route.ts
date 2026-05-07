import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.ZAPIER_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Zapier OAuth not configured (ZAPIER_OAUTH_CLIENT_ID missing). Use API key auth instead." },
      { status: 503 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/zapier/oauth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });

  const response = NextResponse.redirect(
    `https://zapier.com/oauth/authorize?${params.toString()}`,
    { status: 302 }
  );
  response.cookies.set("torqa_zapier_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
