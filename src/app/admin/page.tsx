import PortalLogin from "@/app/portal-login";

export const metadata = { title: "FindIT | Administrator sign-in", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <PortalLogin portal="admin" error={(await searchParams).error}/>;
}
