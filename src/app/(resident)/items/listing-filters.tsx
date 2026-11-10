"use client";

import { useState } from "react";
import Form from "next/form";
import { statusLabel } from "@/lib/reports";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";

export type Filters = Record<"q" | "category" | "area" | "status" | "kind", string>;

export default function ListingFilters({ filters, filterKey, statuses, clearUrl }: {
  filters: Filters; filterKey: string; statuses: string[]; clearUrl: string;
}) {
  const [draft, setDraft] = useState({ filterKey, fields: filters });
  if (draft.filterKey !== filterKey) setDraft({ filterKey, fields: filters });
  const change = (field: keyof Filters, value: string) => setDraft({ filterKey, fields: { ...draft.fields, [field]: value } });
  return <Form action="/items" scroll={false} className="panel form-grid filter-grid my-6">
    <input type="hidden" name="kind" value={filters.kind}/>
    <label>Keyword<input name="q" value={draft.fields.q} onChange={e => change("q", e.target.value)} placeholder="e.g. silver keys"/></label>
    <label>Category<input name="category" value={draft.fields.category} onChange={e => change("category", e.target.value)}/></label>
    <label>Approximate area<input name="area" value={draft.fields.area} onChange={e => change("area", e.target.value)}/></label>
    <label>Status<select name="status" value={draft.fields.status} onChange={e => change("status", e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
    <div className="flex flex-wrap items-center gap-3"><button className="button"><Icon name="search" size={16}/> Search</button><Link href={clearUrl} className="text-link">Clear</Link></div>
  </Form>;
}
