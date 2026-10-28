"use client";

import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel" role="alert"><h1 className="page-title">Something went wrong</h1><p className="muted my-5">We could not load this page. Check your connection and try again.</p><button className="button" onClick={reset}>Try again</button><Link href="/my" className="text-link ml-5">My reports</Link></section>;
}
