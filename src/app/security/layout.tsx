import OperationsShell from "@/app/operations-shell";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "FindIT | Station operations" };

export default async function StationLayout({ children }: { children: React.ReactNode }) {
  const { client, profile } = await requireRole(["officer", "admin"]);
  const { data: station } = profile.role === "officer" && profile.station_id
    ? await client.from("stations").select("name,is_demo").eq("id", profile.station_id).maybeSingle() : { data: null };
  const identity = profile.role === "admin" ? "All assigned references · Administrator" : station?.is_demo ? "Legacy demo assignment" : station?.name ?? (profile.station_id ? "Assigned station reference" : "Station not assigned");
  return <OperationsShell portal="station" identity={identity} admin={profile.role === "admin"}>{children}</OperationsShell>;
}
