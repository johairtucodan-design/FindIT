import OperationsShell from "@/app/operations-shell";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "FindIT | Admin console" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);
  return <OperationsShell portal="admin" identity="FindIT demo administration" admin>{children}</OperationsShell>;
}
