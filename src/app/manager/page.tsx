import { requireRole } from "@/lib/auth";

export default async function ManagerPage() {
  await requireRole(["admin"]);
  return <section className="panel"><p className="eyebrow">Admin workspace</p><h1 className="page-title">Manager</h1><p className="muted mt-4">Station and account management are planned for a later iteration.</p></section>;
  // TODO: Station directory and management UI.
}
