import Link from "@/app/app-link";

export default function StationRecordNotFound() {
  return <section className="panel"><h1 className="page-title">Station record unavailable</h1><p className="muted my-5">This record doesn’t exist or isn’t available in your station queue.</p><Link className="button" href="/security">Back to receiving queue</Link></section>;
}
