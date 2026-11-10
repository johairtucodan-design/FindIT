import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getViewer } from "./supabase/server";
import { portals } from "./staff";

export async function requireUser(signIn: "/auth" | "/staff" | "/admin" = "/auth") {
  const { client, user } = await getViewer();
  if (!user) redirect(signIn);
  return { client, user };
}

export const getRoleProfile = cache(async () => {
  const { client, user } = await getViewer();
  if (!user) return null;
  const { data } = await client.from("profiles").select("role,station_id").eq("id", user.id).maybeSingle();
  return data;
});

export async function requireRole(roles: string[]) {
  const { client, user } = await requireUser(portals[roles.includes("officer") ? "station" : "admin"].login);
  const profile = await getRoleProfile();
  if (!profile || !roles.includes(profile.role)) redirect("/access-denied");
  return { client, user, profile };
}
