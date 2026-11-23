import { notFound } from "next/navigation";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";
import { isUuid } from "@/lib/reports";

export const metadata = { title: "FindIT | Report received" };

export default async function Received({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  if (!ref || !isUuid(ref)) notFound();
  return <section className="panel mx-auto max-w-2xl">
    <p className="eyebrow">Report received</p>
    <h1 className="page-title">Thanks. Your report is with station review.</h1>
    <p className="muted mt-4">Station staff check guest reports before anything appears publicly. FindIT cannot confirm that a station has your item or will arrange a handover.</p>
    <p className="mt-5 text-sm">Reference: <code className="break-all">{ref}</code></p>
    <p className="muted mt-2 text-sm">Keep this reference if you contact a station about your report.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link className="button secondary" href="/stations">Find another station <Icon name="pin" size={16}/></Link>
      <Link className="button secondary" href="/auth">Create an account to track reports</Link>
    </div>
  </section>;
}
