import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { editable, isUuid, type Report } from "@/lib/reports";
import { stationFromRow } from "../../stations/directory";
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
  // Lost reports and edits need an account. Found reports can be submitted as a guest.
  if (!user && (edit !== undefined || kind === "lost")) redirect(`/auth?next=${encodeURIComponent(returnTo)}`);
  let report: Report | undefined;
  if (edit !== undefined) {
    if (!isUuid(edit)) notFound();
    const { data, error } = await client.rpc("item_detail", { target_id: edit });
    if (error) throw new Error("Unable to load this report. Please try again.");
    report = data?.[0];
    if (!user || !report || report.reporter_id !== user.id || report.kind !== kind || !editable(report.status)) notFound();
  }
  const { data: directory } = await client.rpc("station_directory");
  const stations = ((directory ?? []) as (Parameters<typeof stationFromRow>[0] & { is_demo: boolean })[])
    .filter(row => !row.is_demo).map(stationFromRow);
  const existingStation = report?.preferred_station_id ?? null;
  // Only found reports use a station; lost reports never carry one.
  const selectedStation = kind !== "found" ? null : stationId && stations.some(row => row.id === stationId) ? stationId : existingStation;
  return <ReportForm kind={kind} report={report} stations={stations} initialStationId={selectedStation} guest={!user} />;
}
