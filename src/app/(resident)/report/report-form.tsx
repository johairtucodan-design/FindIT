"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { itemCategories, itemColors, type Report } from "@/lib/reports";
import { saveReport } from "./actions";

export default function ReportForm({ kind, report }: { kind: "lost" | "found"; report?: Report }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const categories = report?.category && !itemCategories.includes(report.category as typeof itemCategories[number]) ? [...itemCategories, report.category] : itemCategories;
  const colors = report?.color && !itemColors.includes(report.color as typeof itemColors[number]) ? [...itemColors, report.color] : itemColors;
  const swatches: Record<string, string> = { Black: "#20232b", White: "#fff", Gray: "#9097a3", Silver: "#c6ccd4", Brown: "#80543d", Red: "#da4e4e", Orange: "#ef8a42", Yellow: "#e6bd43", Green: "#319b6c", Blue: "#3979d1", Purple: "#8d5ab9", Pink: "#e889ac", Multicolor: "linear-gradient(135deg,#e889ac 0 25%,#e6bd43 25% 50%,#3979d1 50% 75%,#319b6c 75%)", Unknown: "repeating-linear-gradient(135deg,#fff 0 4px,#b7bdc8 4px 8px)" };
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

  function input(name: "title" | "location_text", label: string, placeholder: string, maxLength: number, help?: string) {
    return <label className="report-field" htmlFor={name} key={name}><span className="report-label">{label} <span aria-hidden="true">*</span></span>{help && <span className="report-hint">{help}</span>}<input id={name} name={name} required maxLength={maxLength} placeholder={placeholder} defaultValue={report?.[name] ?? ""} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}/>{errors[name] && <span id={`${name}-error`} className="field-error">{errors[name]}</span>}</label>;
  }
  function heading(number: string, title: string, subtitle: string, id: string) {
    return <div className="report-section-heading"><span>{number}</span><div><h2 id={id}>{title}</h2><p>{subtitle}</p></div></div>;
  }

  return <div className="report-layout">
    <aside className="report-intro"><p className="eyebrow">Community report / {kind}</p><h1 className="page-title">{report ? "Update your" : "Tell us about your"} <em>{kind} item.</em></h1><p className="muted">A few clear details help people recognize the item.</p><div className="report-steps" aria-label="Report sections"><span><b>01</b> Item details</span><span><b>02</b> When and where</span><span><b>03</b> Optional details</span></div><div className="report-context"><span className={`kind-badge ${kind}`}>{kind.toUpperCase()}</span><p>{kind === "found" ? "New found reports begin as Reported — Not Received." : "New lost reports begin as Open."}</p></div></aside>
    <form onSubmit={submit} noValidate className="report-form">
      {kind === "found" && <aside className="notice"><strong>Reporting a found item does not mean police hold it.</strong><p className="mt-1">Contact a station directly before any handover. FindIT cannot confirm custody or arrange handovers.</p></aside>}
      {Object.keys(errors).length > 0 && <div className="error" role="alert"><strong>Please check your report.</strong>{errors.form && <p>{errors.form}</p>}<ul className="mt-2 list-inside list-disc">{Object.entries(errors).filter(([key, error]) => key !== "form" && error).map(([key, error]) => <li key={key}><a className="underline" href={`#${key}`}>{error}</a></li>)}</ul></div>}
      <section className="report-section" aria-labelledby="item-heading">{heading("01", "Item details", "What would someone notice first?", "item-heading")}<div className="report-fields">{input("title", "Item title", "e.g. Black leather wallet", 120)}<label className="report-field" htmlFor="category"><span className="report-label">Category <span aria-hidden="true">*</span></span><select id="category" name="category" required defaultValue={report?.category ?? ""} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "category-error" : undefined}><option value="" disabled>Choose a category</option>{categories.map(category=><option key={category} value={category}>{category}</option>)}</select>{errors.category && <span id="category-error" className="field-error">{errors.category}</span>}</label><fieldset className="report-field color-field" id="color" aria-describedby={errors.color ? "color-error" : undefined}><legend className="report-label">Color <span aria-hidden="true">*</span></legend><span className="report-hint">Choose the closest main color.</span><div className="color-options">{colors.map(color=><label className="color-option" key={color}><input type="radio" name="color" value={color} required defaultChecked={report?.color===color} aria-invalid={Boolean(errors.color)}/><span className="color-swatch" style={{background:swatches[color]??"#a0a0a0"}} aria-hidden="true"/><span>{color}</span></label>)}</div>{errors.color && <span id="color-error" className="field-error">{errors.color}</span>}</fieldset><label className="report-field" htmlFor="description"><span className="report-label">Description <span aria-hidden="true">*</span></span><span className="report-hint">Include visible details that are safe to share.</span><textarea id="description" name="description" required maxLength={3000} rows={4} placeholder="Shape, material, brand, or other visible details…" defaultValue={report?.description ?? ""} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined}/>{errors.description && <span id="description-error" className="field-error">{errors.description}</span>}</label></div></section>
      <section className="report-section" aria-labelledby="place-heading">{heading("02", "When and where", "An approximate location is enough.", "place-heading")}<div className="report-fields"><div className="report-row">{input("location_text", "Location", "e.g. Near the city hall entrance", 300)}<label className="report-field" htmlFor="occurred_at"><span className="report-label">Date {kind === "lost" ? "lost" : "found"} <span aria-hidden="true">*</span></span><input id="occurred_at" name="occurred_at" type="date" required max={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })} defaultValue={report?.occurred_at.slice(0, 10) ?? ""} aria-invalid={Boolean(errors.occurred_at)} aria-describedby={errors.occurred_at ? "occurred_at-error" : undefined}/>{errors.occurred_at && <span id="occurred_at-error" className="field-error">{errors.occurred_at}</span>}</label></div><p className="report-hint">Need a public station contact? <Link className="text-link" href="/stations">Browse Iligan station references</Link>. Listings do not confirm a drop-off or handover service.</p></div></section>
      <section className="report-section" aria-labelledby="contact-heading">{heading("03", "Optional details", "Your account contact is added automatically.", "contact-heading")}<div className="report-fields"><p className="account-contact">We’ll use your account phone number when available, otherwise your sign-in email. It stays private and is visible only to you and authorized station staff.</p><label className="report-field" htmlFor="private_details"><span className="report-label">Private identifying details <span className="optional">Optional</span></span><span className="report-hint">Only you, officers and admins can read this. Do not add passwords or identity documents.</span><textarea id="private_details" name="private_details" maxLength={3000} rows={3} placeholder="Details that can help verify ownership…" defaultValue={report?.private_details ?? ""}/></label><label className="report-field" htmlFor="photo"><span className="report-label">{report?.photo_path ? "Replace photo" : "Add a photo"} <span className="optional">Optional</span></span><span className="photo-drop"><span className="photo-icon" aria-hidden="true">＋</span><strong>{photo ? photo.name : "Choose an image"}</strong><span>JPEG, PNG or WebP · up to 4 MiB</span><input id="photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={e => { setPhoto(e.target.files?.[0] ?? null); setErrors(current => ({ ...current, photo: "" })); }} aria-invalid={Boolean(errors.photo)} aria-describedby="photo-help"/></span><span id="photo-help" className={errors.photo ? "field-error" : "report-hint"}>{errors.photo || "Existing photo stays if no replacement is selected. Maximum 25 megapixels."}</span></label>{preview && <img src={preview} alt="Selected report photo preview" className="report-preview"/>}</div></section>
      <div className="report-submit"><div><strong>{report ? "Ready to save changes?" : "Ready to submit?"}</strong><p>Required fields are marked *; contact details come from your account.</p></div><div><Link className="text-link" href={report ? `/items/${report.id}` : "/my"}>Cancel</Link><button className="button" disabled={pending}>{pending ? "Saving…" : report ? "Save changes" : "Submit report"}</button></div></div>
    </form>
  </div>;
}
