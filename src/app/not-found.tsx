import Link from "next/link";
export default function NotFound() {
  return <section className="panel"><h1 className="page-title">Report unavailable</h1><p className="muted my-5">This page does not exist, or your account cannot access it.</p><Link className="button" href="/my">My reports</Link></section>;
}
