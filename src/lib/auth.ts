import "server-only";
import { redirect } from "next/navigation";
import { getViewer } from "./supabase/server";

export async function requireUser(signIn: "/auth" | "/staff" = "/auth") {
  const { client, user } = await getViewer();
  if (!user) redirect(signIn);
  return { client, user };
}

export async function requireRole(roles: string[]) {
  const { client, user } = await requireUser("/staff");
  const { data, error } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (error || !data || !roles.includes(data.role)) redirect("/access-denied");
  return { client, user };
}
