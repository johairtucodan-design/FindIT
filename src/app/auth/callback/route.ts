import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { codespacesHost } from "@/lib/codespaces.mjs";

export async function GET(request: NextRequest) {
  const host = codespacesHost(process.env);
  const origin = host ? `https://${host}` : request.url;
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/my", origin));
  }
  return NextResponse.redirect(new URL("/auth?error=confirmation", origin));
}
