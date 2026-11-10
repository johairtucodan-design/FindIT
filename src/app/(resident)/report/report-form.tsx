"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Report } from "@/lib/reports";
import { saveReport } from "./actions";

export default function ReportForm({ kind, report, stations }: { kind: "lost" | "found"; report?: Report; stations: { id: string; name: string }[] }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); setErrors({});
    const chosen = form.get("photo");
    if (chosen instanceof File && (chosen.size || chosen.name) && (chosen.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(chosen.type))) {
      setErrors({ photo: "Choose a JPEG, PNG or WebP image, 4 MiB or smaller." }); return;
    }
    setPending(true);
    try { setErrors((await saveReport(kind, report?.id ?? null, form)).errors); }
    catch { setErrors({ form: "Unable to save. Your entries are kept; check your connection and try again." }); }
    finally { setPending(false); }
  }

  function input(name: "title" | "category" | "color" | "location_text" | "contact_method", label: string, placeholder: string, maxLength: number, help?: string) {
    return <label className="report-field" htmlFor={name} key={name}><span className="report-label">{label} <span aria-hidden="true">*</span></span>{help && <span className="report-hint">{help}</span>}<input id={name} name={name} required maxLength={maxLength} placeholder={placeholder} defaultValue={report?.[name] ?? ""} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}/>{errors[name] && <span id={`${name}-error`} className="field-error">{errors[name]}</span>}</label>;
  }
  function heading(number: string, title: string, subtitle: string, id: string) {
    return <div className="report-section-heading"><span>{number}</span><div><h2 id={id}>{title}</h2><p>{subtitle}</p></div></div>;
  }

  return <div className="report-layout">
    <aside className="report-intro"><p className="eyebrow">Community report / {kind}</p><h1 className="page-title">{report ? "Update your" : "Tell us about your"} <em>{kind} item.</em></h1><p className="muted">A few clear details help people recognize the item.</p><div className="report-steps" aria-label="Report sections"><span><b>01</b> Item details</span><span><b>02</b> When and where</span><span><b>03</b> Contact and photo</span></div><div className="report-context"><span className={`kind-badge ${kind}`}>{kind.toUpperCase()}</span><p>{kind === "found" ? "New found reports begin as Reported — Not Received." : "New lost reports begin as Open."}</p></div></aside>
    <form onSubmit={submit} noValidate className="report-form">
      {kind === "found" && <aside className="notice"><strong>Hand this item to police. Reporting it does not mean police hold it.</strong><p className="mt-1">Contact the police directly for handover instructions. FindIT does not arrange real handovers.</p></aside>}
      {Object.keys(errors).length > 0 && <div className="error" role="alert"><strong>Please check your report.</strong>{errors.form && <p>{errors.form}</p>}<ul className="mt-2 list-inside list-disc">{Object.entries(errors).filter(([key, error]) => key !== "form" && error).map(([key, error]) => <li key={key}><a className="underline" href={`#${key}`}>{error}</a></li>)}</ul></div>}
      <section className="report-section" aria-labelledby="item-heading">{heading("01", "Item details", "What would someone notice first?", "item-heading")}<div className="report-fields">{input("title", "Item title", "e.g. Silver house keys", 120)}<div className="report-row">{input("category", "Category", "e.g. Keys", 80)}{input("color", "Color", "e.g. Silver and blue", 80)}</div><label className="report-field" htmlFor="description"><span className="report-label">Description <span aria-hidden="true">*</span></span><span className="report-hint">Include identifying features that are safe to share.</span><textarea id="description" name="description" required maxLength={3000} rows={4} placeholder="Shape, material, brand, or other visible details…" defaultValue={report?.description ?? ""} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined}/>{errors.description && <span id="description-error" className="field-error">{errors.description}</span>}</label></div></section>
      <section className="report-section" aria-labelledby="place-heading">{heading("02", "When and where", "An approximate location is enough.", "place-heading")}<div className="report-fields"><div className="report-row">{input("location_text", "Location", "e.g. Near the city hall entrance", 300)}<label className="report-field" htmlFor="occurred_at"><span className="report-label">Date {kind === "lost" ? "lost" : "found"} <span aria-hidden="true">*</span></span><input id="occurred_at" name="occurred_at" type="date" required max={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })} defaultValue={report?.occurred_at.slice(0, 10) ?? ""} aria-invalid={Boolean(errors.occurred_at)} aria-describedby={errors.occurred_at ? "occurred_at-error" : undefined}/>{errors.occurred_at && <span id="occurred_at-error" className="field-error">{errors.occurred_at}</span>}</label></div><label className="report-field" htmlFor="intended_station_id"><span className="report-label">Demo drop-off station <span className="optional">Optional</span></span><select id="intended_station_id" name="intended_station_id" defaultValue={report?.intended_station_id ?? ""} aria-invalid={Boolean(errors.intended_station_id)}><option value="">No station selected</option>{stations.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select><span className="report-hint">For the simulated workflow only. Selecting a station does not confirm receipt.</span>{errors.intended_station_id && <span className="field-error">{errors.intended_station_id}</span>}</label></div></section>
      <section className="report-section" aria-labelledby="contact-heading">{heading("03", "Contact and photo", "Keep proof and contact details private.", "contact-heading")}<div className="report-fields">{input("contact_method", "Private contact method", "Email or phone number", 250, "Only authorized station staff can use this to contact you.")}<label className="report-field" htmlFor="private_details"><span className="report-label">Private identifying details <span className="optional">Optional</span></span><span className="report-hint">Only you, officers and admins can read this. Do not add passwords or identity documents.</span><textarea id="private_details" name="private_details" maxLength={3000} rows={3} placeholder="Details that can help verify ownership…" defaultValue={report?.private_details ?? ""}/></label><label className="report-field" htmlFor="photo"><span className="report-label">{report?.photo_path ? "Replace photo" : "Add a photo"} <span className="optional">Optional</span></span><span className="photo-drop"><span className="photo-icon" aria-hidden="true">＋</span><strong>{photo ? photo.name : "Choose an image"}</strong><span>JPEG, PNG or WebP · up to 4 MiB</span><input id="photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={e => { setPhoto(e.target.files?.[0] ?? null); setErrors(current => ({ ...current, photo: "" })); }} aria-invalid={Boolean(errors.photo)} aria-describedby="photo-help"/></span><span id="photo-help" className={errors.photo ? "field-error" : "report-hint"}>{errors.photo || "Existing photo stays if no replacement is selected. Maximum 25 megapixels."}</span></label>{preview && <img src={preview} alt="Selected report photo preview" className="report-preview"/>}</div></section>
      <div className="report-submit"><div><strong>{report ? "Ready to save changes?" : "Ready to submit?"}</strong><p>Fields marked * are required.</p></div><div><Link className="text-link" href={report ? `/items/${report.id}` : "/my"}>Cancel</Link><button className="button" disabled={pending}>{pending ? "Saving…" : report ? "Save changes" : "Submit report"}</button></div></div>
    </form>
  </div>;
}
