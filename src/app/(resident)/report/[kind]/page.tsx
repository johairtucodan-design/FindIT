import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { editable, isUuid, type Report } from "@/lib/reports";
import ReportForm from "../report-form";

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ edit?: string; station?: string }>;
}) {
  const { kind } = await params;
  if (kind !== "lost" && kind !== "found") notFound();
  const { edit, station } = await searchParams;
  const stationId = typeof station === "string" && isUuid(station) ? station : null;
  const returnTo = `/report/${kind}${stationId ? `?station=${encodeURIComponent(stationId)}` : ""}`;
  const { client, user } = await getViewer();
  // Editing needs an account; a new report can be submitted as a guest.
  if (!user && edit !== undefined) redirect(`/auth?next=${encodeURIComponent(returnTo)}`);
  let report: Report | undefined;
  if (edit !== undefined) {
    if (!isUuid(edit)) notFound();
    const { data, error } = await client.rpc("item_detail", { target_id: edit });
    if (error) throw new Error("Unable to load this report. Please try again.");
    report = data?.[0];
    if (!user || !report || report.reporter_id !== user.id || report.kind !== kind || !editable(report.status)) notFound();
  }
  const { data: directory } = await client.rpc("station_directory");
  const stations = (directory ?? []).filter((row: { type?: string }) => row.type === "public_reference_police_station").map((row: { id: string; name: string }) => ({ id: row.id, name: row.name }));
  const existingStation = report?.preferred_station_id ?? null;
  const selectedStation = stationId && stations.some((row: { id: string }) => row.id === stationId) ? stationId : existingStation;
  return <ReportForm kind={kind} report={report} stations={stations} initialStationId={selectedStation} guest={!user} />;
}
