import { requireRole } from "@/lib/auth";

export default async function SecurityPage() {
  await requireRole(["officer", "admin"]);
  return <section className="panel"><p className="eyebrow">Officer workspace</p><h1 className="page-title">Security</h1><p className="muted mt-4">Receipt and custody screens are planned for a later iteration.</p></section>;
  // TODO: Police receipt and custody workflow.
}
