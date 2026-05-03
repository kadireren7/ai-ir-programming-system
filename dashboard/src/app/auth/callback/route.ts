import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublicEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const env = supabasePublicEnv();
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? "/overview";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/overview";

  if (!env) {
    return NextResponse.redirect(new URL(safe, requestUrl.origin));
  }

  const code = requestUrl.searchParams.get("code");

  let response = NextResponse.redirect(new URL(safe, requestUrl.origin));

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.redirect(new URL(safe, requestUrl.origin));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
