"use client";

import { useEffect, useState } from "react";
import Form from "next/form";
import { statusLabel } from "@/lib/reports";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";

export type Filters = Record<"q" | "category" | "area" | "status" | "kind", string>;

export default function ListingFilters({ filters, statuses, clearUrl }: {
  filters: Filters; statuses: string[]; clearUrl: string;
}) {
  const [fields, setFields] = useState(filters);
  const [wide, setWide] = useState(false);
  const change = (field: keyof Filters, value: string) => setFields({ ...fields, [field]: value });
  const activeCount = Number(Boolean(filters.category)) + Number(Boolean(filters.area)) + Number(Boolean(filters.status));
  // On desktop the filter fields stay visible in the side rail; on mobile they stay collapsed.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return <Form action="/items" scroll={false} className="panel listing-search-form">
    <input type="hidden" name="kind" value={filters.kind}/>
    <div className="listing-search-row"><label htmlFor="listing-search">Search items<input id="listing-search" name="q" type="search" value={fields.q} onChange={e => change("q", e.target.value)} placeholder="Try wallet, keys, or umbrella"/></label><button className="button"><Icon name="search" size={16}/> Search</button></div>
    <details className="listing-filter-details" open={wide || activeCount > 0}>
      <summary><span><Icon name="list" size={17}/> More filters</span>{activeCount > 0 && <small>{activeCount} active</small>}</summary>
      <div className="listing-filter-fields"><label>Category<input name="category" value={fields.category} onChange={e => change("category", e.target.value)} placeholder="e.g. Electronics"/></label><label>Approximate area<input name="area" value={fields.area} onChange={e => change("area", e.target.value)} placeholder="e.g. Pala-o"/></label><label>Status<select name="status" value={fields.status} onChange={e => change("status", e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label><div className="listing-filter-actions"><button className="button secondary">Apply filters</button><Link href={clearUrl} className="text-link">Clear filters</Link></div></div>
    </details>
  </Form>;
}
