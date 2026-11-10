import PortalLogin from "@/app/portal-login";

export const metadata = { title: "FindIT | Administrator sign-in" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <PortalLogin portal="admin" error={(await searchParams).error}/>;
}
