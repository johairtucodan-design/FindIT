import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthForm from "./auth-form";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (user && error !== "signout") redirect("/my");
  return <AuthForm initialError={error === "confirmation" ? "Confirmation failed or expired. Try signing in or registering again." : error === "signout" ? "Sign out failed. Please try again." : undefined} />;
}
