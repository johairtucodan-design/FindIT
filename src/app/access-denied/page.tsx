import Link from "next/link";

export default function AccessDenied() {
  return <main className="site-width site-main" id="main"><section className="panel mx-auto max-w-lg"><p className="eyebrow">Restricted workspace</p><h1 className="page-title">Access denied</h1><p className="muted my-5">Your account does not have the role needed to access this page.</p><div className="flex flex-wrap gap-3"><Link className="button" href="/my">My reports</Link><Link className="button secondary" href="/staff">Station sign-in</Link><Link className="button secondary" href="/admin">Admin sign-in</Link></div></section></main>;
}
