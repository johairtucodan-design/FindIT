"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Report } from "@/lib/reports";
import { saveReport } from "./actions";

export default function ReportForm({ kind, report }: { kind: "lost" | "found"; report?: Report }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErrors({});
    const photo = form.get("photo");
    if (photo instanceof File && (photo.size || photo.name) && (photo.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(photo.type))) {
      setErrors({ photo: "Choose a JPEG, PNG or WebP image, 5 MiB or smaller." });
      return;
    }
    setPending(true);
    try { setErrors((await saveReport(kind, report?.id ?? null, form)).errors); }
    catch { setErrors({ form: "Unable to save. Your entries are kept; check your connection and try again." }); }
    finally { setPending(false); }
  }
  const fields = [
    ["title", "Title", 120, "e.g. Silver house keys"],
    ["category", "Category", 80, "e.g. Keys, wallet, electronics"],
    ["color", "Color", 80, "e.g. Silver and blue"],
    ["location_text", "Location", 300, "e.g. Near the community center entrance"],
  ] as const;
  return (
    <section className="panel mx-auto max-w-2xl">
      <p className="eyebrow">Citizen reporting</p>
      <h1 className="page-title">{report ? "Edit" : "Report a"} {kind} item</h1>
      <p className="muted mt-3">Fields marked * are required. Keep identifying proof in private details.</p>
      {kind === "found" && <aside className="notice mt-6"><strong>Hand this item to police. Reporting it does not mean police hold it.</strong><p className="mt-2">This report starts as Pending Surrender. This coursework prototype does not arrange a real police handover.</p></aside>}
      <form onSubmit={submit} noValidate className="form-grid mt-7">
        {Object.keys(errors).length > 0 && <div className="error" role="alert"><p className="font-bold">Please check your report.</p>{errors.form && <p>{errors.form}</p>}<ul className="mt-2 list-inside list-disc">{Object.entries(errors).filter(([key]) => key !== "form").map(([key, error]) => <li key={key}><a className="underline" href={`#${key}`}>{error}</a></li>)}</ul></div>}
        {fields.map(([name, label, max, placeholder]) => <label key={name} htmlFor={name}>{label} *<input id={name} name={name} required maxLength={max} placeholder={placeholder} defaultValue={report?.[name] ?? ""} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} />{errors[name] && <span id={`${name}-error`} className="field-error">{errors[name]}</span>}</label>)}
        <label htmlFor="description">Description *<textarea id="description" name="description" required maxLength={3000} rows={4} defaultValue={report?.description ?? ""} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined} />{errors.description && <span id="description-error" className="field-error">{errors.description}</span>}</label>
        <label htmlFor="occurred_at">Date {kind === "lost" ? "lost" : "found"} *<input id="occurred_at" name="occurred_at" type="date" required defaultValue={report?.occurred_at.slice(0, 10) ?? ""} aria-invalid={Boolean(errors.occurred_at)} aria-describedby={errors.occurred_at ? "occurred_at-error" : undefined} />{errors.occurred_at && <span id="occurred_at-error" className="field-error">{errors.occurred_at}</span>}</label>
        <label htmlFor="private_details">Private details <span className="muted font-normal">(optional)</span><textarea id="private_details" name="private_details" maxLength={3000} rows={3} defaultValue={report?.private_details ?? ""} aria-describedby="private-help" /><span id="private-help" className="muted text-sm font-normal">Only you, officers and admins can read this. Do not add passwords or sensitive identity documents.</span></label>
        <label htmlFor="photo">{report?.photo_path ? "Replace photo" : "Photo"} <span className="muted font-normal">(optional)</span><input id="photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" aria-invalid={Boolean(errors.photo)} aria-describedby="photo-help" /><span id="photo-help" className={errors.photo ? "field-error" : "muted text-sm font-normal"}>{errors.photo ?? "JPEG, PNG or WebP. Maximum 5 MiB and 25 megapixels. Existing photo stays if no replacement is selected."}</span></label>
        <div className="flex flex-wrap items-center gap-4"><button className="button" disabled={pending}>{pending ? "Saving…" : report ? "Save changes" : "Submit report"}</button><Link className="text-link" href={report ? `/items/${report.id}` : "/my"}>Cancel</Link></div>
      </form>
    </section>
  );
}
