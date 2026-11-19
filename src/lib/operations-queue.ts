export type OperationalReport = {
  kind: "lost" | "found";
  status: string;
  publication_status: string;
  held_at_station_id: string | null;
  is_demo: boolean;
  archived_at?: string | null;
};

const activeCustodyStatuses = new Set(["received_by_police", "in_custody", "approved_for_pickup"]);

export function isOperationalReport(report: OperationalReport, view: "receiving" | "review" | "inventory") {
  if (report.is_demo || report.archived_at) return false;
  if (view === "inventory") return Boolean(report.held_at_station_id) && activeCustodyStatuses.has(report.status);
  if (view === "review") return ["pending", "rejected"].includes(report.publication_status);
  return !report.held_at_station_id && report.kind === "found" && report.status === "pending_surrender";
}
