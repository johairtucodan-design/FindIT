"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { colorHex, colorPresets } from "@/lib/colors";
import { itemCategories, type Report } from "@/lib/reports";
import type { Station } from "../stations/directory";
import LocationPicker, { nearestStation, type Point } from "./location-picker";
import { saveReport, submitGuestReport } from "./actions";

export default function ReportForm({ kind, report, stations, initialStationId, guest = false }: { kind: "lost" | "found"; report?: Report; stations: readonly Station[]; initialStationId: string | null; guest?: boolean }) {
  const [photo, setPhoto] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}), [pending, setPending] = useState(false);
  const [color, setColor] = useState(report?.color ?? "");
  const [point, setPoint] = useState<Point | null>(null);
  const [preferredStation, setPreferredStation] = useState(initialStationId ?? "");
  const categories = report?.category && !itemCategories.includes(report.category as typeof itemCategories[number]) ? [...itemCategories, report.category] : itemCategories;
  const resolvedColor = colorHex(color), pickerColor = resolvedColor ?? "#808080";
  const colorLabel = color ? resolvedColor ? `${resolvedColor}${color !== resolvedColor ? ` · ${color}` : ""}` : color === "Unknown" ? "Not sure" : `${color} · saved value` : "Choose a color";
  const hasStations = stations.some(station => station.coordinates.value);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); setErrors({});
    const chosen = guest ? null : form.get("photo");
    if (chosen instanceof File && (chosen.size || chosen.name) && (chosen.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(chosen.type))) {
      setErrors({ photo: "Choose a JPEG, PNG or WebP image, 4 MiB or smaller." }); return;
    }
    setPending(true);
    try { setErrors((await (guest ? submitGuestReport(kind, form) : saveReport(kind, report?.id ?? null, form))).errors); }
    catch { setErrors({ form: "Unable to save. Your entries are kept; check your connection and try again." }); }
    finally { setPending(false); }
  }

  function heading(number: string, title: string, subtitle: string, id: string) {
    return <div className="report-section-heading"><span>{number}</span><div><h2 id={id}>{title}</h2><p>{subtitle}</p></div></div>;
  }

  function chooseColor(value: string) {
    setColor(value); setErrors(current => ({ ...current, color: "" }));
  }

  function placePoint(next: Point) {
    setPoint(next); setErrors(current => ({ ...current, location: "" }));
    // Offer the closest station by default; the person can change it.
    const closest = nearestStation(next, stations);
    if (closest) setPreferredStation(closest.station.id);
  }

  return <div className="report-layout">
    <aside className="report-intro"><p className="eyebrow">Community report / {kind}</p><h1 className="page-title">{report ? "Update your" : "Tell us about your"} <em>{kind} item.</em></h1><div className="report-steps" aria-label="Report sections"><span><b>01</b> Item</span><span><b>02</b> Where</span><span><b>03</b> Contact</span></div><div className="report-context"><span className={`kind-badge ${kind}`}>{kind.toUpperCase()}</span><p>{kind === "found" ? "New found reports begin as Reported — Not Received." : "New lost reports begin as Open."}</p></div></aside>
    <form onSubmit={submit} noValidate className="report-form">
      {guest && <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="honeypot"/>}
      {guest && <aside className="notice"><strong>Reporting as a guest.</strong><p className="mt-1">Station staff review guest reports before anything appears publicly. <Link className="text-link" href="/auth">Sign in</Link> to track reports and add a photo.</p></aside>}
      {Object.keys(errors).length > 0 && <div className="error" role="alert"><strong>Please check your report.</strong>{errors.form && <p>{errors.form}</p>}<ul className="mt-2 list-inside list-disc">{Object.entries(errors).filter(([key, error]) => key !== "form" && error).map(([key, error]) => <li key={key}><a className="underline" href={`#${key}`}>{error}</a></li>)}</ul></div>}

      <section className="report-section" aria-labelledby="item-heading">{heading("01", "Item", "What would someone notice first?", "item-heading")}<div className="report-fields">
        <label className="report-field" htmlFor="title"><span className="report-label">Item title <span aria-hidden="true">*</span></span><input id="title" name="title" required maxLength={120} placeholder="e.g. Black leather wallet" defaultValue={report?.title ?? ""} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined}/>{errors.title && <span id="title-error" className="field-error">{errors.title}</span>}</label>
        <label className="report-field" htmlFor="category"><span className="report-label">Category <span aria-hidden="true">*</span></span><select id="category" name="category" required defaultValue={report?.category ?? ""} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "category-error" : undefined}><option value="" disabled>Choose a category</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select>{errors.category && <span id="category-error" className="field-error">{errors.category}</span>}</label>
        <fieldset className="report-field color-field" id="color" aria-describedby={errors.color ? "color-error" : "color-help"} aria-required="true">
          <legend className="report-label">Color <span aria-hidden="true">*</span></legend>
          <div className="color-current"><span className="color-current-swatch" style={resolvedColor ? { background: resolvedColor } : undefined} aria-hidden="true"/><strong>{colorLabel}</strong></div>
          <div className="color-dots" role="group" aria-label="Common colors">
            {colorPresets.filter(preset => ["Black", "White", "Gray", "Silver", "Brown", "Red", "Blue", "Green"].includes(preset.name)).map(preset => <button className="color-dot" key={preset.hex} type="button" title={preset.name} aria-label={`Set color to ${preset.name}`} aria-pressed={color === preset.hex} onClick={() => chooseColor(preset.hex)}><span style={{ background: preset.hex }} aria-hidden="true"/></button>)}
            <button className="color-dot color-dot-unknown" type="button" title="Not sure" aria-label="Not sure" aria-pressed={color === "Unknown"} onClick={() => chooseColor("Unknown")}><span aria-hidden="true">?</span></button>
            <label className="color-dot color-dot-more" title="Other color"><span aria-hidden="true">+</span><span className="sr-only">Choose another color</span><input type="color" value={pickerColor} aria-label="Choose another color" aria-invalid={Boolean(errors.color)} onChange={event => chooseColor(event.target.value.toUpperCase())}/></label>
          </div>
          <input type="hidden" name="color" value={color}/>{errors.color && <span id="color-error" className="field-error">{errors.color}</span>}
        </fieldset>
        <label className="report-field" htmlFor="description"><span className="report-label">Description <span aria-hidden="true">*</span></span><textarea id="description" name="description" required maxLength={3000} rows={3} placeholder="Shape, material, brand, or other visible details" defaultValue={report?.description ?? ""} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined}/>{errors.description && <span id="description-error" className="field-error">{errors.description}</span>}</label>
      </div></section>

      <section className="report-section" aria-labelledby="place-heading">{heading("02", kind === "found" ? "Where you found it" : "Where you lost it", "Pin the spot on the map.", "place-heading")}<div className="report-fields">
        {hasStations ? <div className={errors.location ? "pin-field-error" : undefined} id="location" aria-invalid={Boolean(errors.location)}>
          <LocationPicker kind={kind} stations={stations} point={point} onPoint={placePoint} preferredId={preferredStation} onPreferred={id => { setPreferredStation(id); setErrors(current => ({ ...current, preferred_station_id: "" })); }}/>
          {errors.location && <span className="field-error">{errors.location}</span>}
        </div> : <p className="notice">The station map is unavailable right now. Try again later.</p>}
        <input type="hidden" name="latitude" value={point?.latitude ?? ""}/>
        <input type="hidden" name="longitude" value={point?.longitude ?? ""}/>
        <input type="hidden" name="preferred_station_id" value={preferredStation}/>
        <label className="report-field" htmlFor="location_text"><span className="report-label">Landmark or nearby detail <span className="optional">Optional</span></span><input id="location_text" name="location_text" maxLength={300} placeholder="e.g. Near the city hall entrance" defaultValue={report?.location_text && report.location_text !== "Pinned on map" ? report.location_text : ""}/></label>
        <label className="report-field" htmlFor="occurred_at"><span className="report-label">Date {kind === "lost" ? "lost" : "found"} <span aria-hidden="true">*</span></span><input id="occurred_at" name="occurred_at" type="date" required max={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })} defaultValue={report?.occurred_at.slice(0, 10) ?? ""} aria-invalid={Boolean(errors.occurred_at)} aria-describedby={errors.occurred_at ? "occurred_at-error" : undefined}/>{errors.occurred_at && <span id="occurred_at-error" className="field-error">{errors.occurred_at}</span>}</label>
        {errors.preferred_station_id && <span className="field-error">{errors.preferred_station_id}</span>}
      </div></section>

      <details className="report-section report-optional-details" aria-labelledby="contact-heading" open={Boolean(errors.private_details || errors.photo || errors.contact_method)}><summary>{heading("03", "Contact", guest ? "Required for guest reports." : "Your account contact is added automatically.", "contact-heading")}</summary><div className="report-fields">{guest ? <label className="report-field" htmlFor="contact_method"><span className="report-label">Contact email or phone <span aria-hidden="true">*</span></span><span className="report-hint">Station staff use this only to reach you about this report. It is never shown publicly.</span><input id="contact_method" name="contact_method" required maxLength={250} placeholder="you@example.com or 09xx xxx xxxx" defaultValue={report?.contact_method ?? ""} aria-invalid={Boolean(errors.contact_method)}/>{errors.contact_method && <span className="field-error">{errors.contact_method}</span>}</label> : <p className="account-contact">We’ll use your account phone number when available, otherwise your sign-in email. It stays private and is visible only to you and authorized station staff.</p>}<label className="report-field" htmlFor="private_details"><span className="report-label">Private identifying details <span className="optional">Optional</span></span><span className="report-hint">Only you, officers and admins can read this. Do not add passwords or identity documents.</span><textarea id="private_details" name="private_details" maxLength={3000} rows={3} placeholder="Details that can help verify ownership" defaultValue={report?.private_details ?? ""}/></label>{!guest && <label className="report-field" htmlFor="photo"><span className="report-label">{report?.photo_path ? "Replace photo" : "Add a photo"} <span className="optional">Optional</span></span><span className="photo-drop"><span className="photo-icon" aria-hidden="true">＋</span><strong>{photo ? photo.name : "Choose an image"}</strong><span>JPEG, PNG or WebP · up to 4 MiB</span><input id="photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={event => { setPhoto(event.target.files?.[0] ?? null); setErrors(current => ({ ...current, photo: "" })); }} aria-invalid={Boolean(errors.photo)} aria-describedby="photo-help"/></span><span id="photo-help" className={errors.photo ? "field-error" : "report-hint"}>{errors.photo || "Existing photo stays if no replacement is selected. Maximum 25 megapixels."}</span></label>}{!guest && preview && <img src={preview} alt="Selected report photo preview" className="report-preview"/>}</div></details>

      <div className="report-submit"><div><strong>{report ? "Ready to save changes?" : "Ready to submit?"}</strong></div><div><Link className="text-link" href={report ? `/items/${report.id}` : guest ? "/stations" : "/my"}>Cancel</Link><button className="button" disabled={pending}>{pending ? "Saving…" : report ? "Save changes" : "Submit report"}</button></div></div>
    </form>
  </div>;
}
