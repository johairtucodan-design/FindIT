import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { editable, isUuid, type Report } from "@/lib/reports";
import ReportForm from "../report-form";

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { kind } = await params;
  if (kind !== "lost" && kind !== "found") notFound();
  const { client, user } = await requireUser();
  const { edit } = await searchParams;
  let report: Report | undefined;
  if (edit !== undefined) {
    if (!isUuid(edit)) notFound();
    const { data, error } = await client.rpc("item_detail", { target_id: edit });
    if (error) throw new Error("Unable to load this report. Please try again.");
    report = data?.[0];
    if (!report || report.reporter_id !== user.id || report.kind !== kind || !editable(report.status)) notFound();
  }
  return <ReportForm kind={kind} report={report} />;
}
