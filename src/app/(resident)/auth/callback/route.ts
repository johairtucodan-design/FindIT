import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { codespacesHost } from "@/lib/codespaces.mjs";
import { afterAuthReportPath } from "@/lib/station-selection";

export async function GET(request: NextRequest) {
  const host = codespacesHost(process.env);
  const origin = host ? `https://${host}` : request.url;
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = afterAuthReportPath(request.nextUrl.searchParams.get("next")) ?? "/my";
      return NextResponse.redirect(new URL(destination, origin));
    }
  }
  const destination = new URL("/auth?error=confirmation", origin);
  const next = afterAuthReportPath(request.nextUrl.searchParams.get("next"));
  if (next) destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}
