import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export async function requireUser() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/auth");
  return { client, user };
}

export async function requireRole(roles: string[]) {
  const { client, user } = await requireUser();
  const { data, error } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (error || !data || !roles.includes(data.role)) redirect("/access-denied");
  return { client, user };
}
