import PortalLogin from "@/app/portal-login";

export const metadata = { title: "FindIT | Station officer sign-in" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <PortalLogin portal="station" error={(await searchParams).error}/>;
}
