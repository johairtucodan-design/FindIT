import Link from "next/link";

export default function AccessDenied() {
  return <section className="panel"><p className="eyebrow">Restricted workspace</p><h1 className="page-title">Access denied</h1><p className="muted my-5">Your account does not have the role needed to access this page.</p><Link className="button" href="/my">Back to my reports</Link></section>;
}
