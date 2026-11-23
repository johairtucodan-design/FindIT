"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { removeReportPhoto, uploadReportPhoto } from "@/lib/report-photos";
import { accountContact, editable, isUuid, validateReport, type Report } from "@/lib/reports";

export async function saveReport(kind: string, id: string | null, form: FormData): Promise<{ errors: Record<string, string> }> {
  const errors: Record<string, string> = {};
  if (kind !== "lost" && kind !== "found") errors.form = "Invalid report type.";
  if (id && !isUuid(id)) errors.form = "Invalid report ID.";
  if (Object.keys(errors).length) return { errors };
  const client = await createClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return { errors: { form: "Your session expired. Sign in in another tab, then try saving again." } };
  let existing: Report | undefined;
  if (id) {
    const { data, error } = await client.rpc("item_detail", { target_id: id });
    existing = data?.[0];
    if (error || !existing || existing.reporter_id !== user.id || existing.kind !== kind || !editable(existing.status)) {
      return { errors: { form: "You cannot edit this report. It may have entered police custody." } };
    }
  }
  const { values, point, occurred_at, errors: formErrors } = validateReport(form, existing);
  if (Object.keys(formErrors).length) return { errors: formErrors };
  const { data: profile } = await client.from("profiles").select("phone").eq("id", user.id).maybeSingle();
  const contactMethod = accountContact(profile?.phone, user.email);
  if (!contactMethod) return { errors: { form: "Add a contact email or phone number to your account before reporting an item." } };
  const submittedStation = form.get("preferred_station_id");
  const preferredStation = submittedStation === null ? existing?.preferred_station_id ?? "" : String(submittedStation).trim();
  if (preferredStation && !isUuid(preferredStation)) return { errors: { preferred_station_id: "Choose a valid public reference station." } };
  if (preferredStation) {
    const { data: directory, error: directoryError } = await client.rpc("station_directory");
    const eligible = (directory ?? []).some((entry: { id?: string; type?: string }) => entry.id === preferredStation && entry.type === "public_reference_police_station");
    if (directoryError || !eligible) return { errors: { preferred_station_id: "Choose an available public reference station from the list." } };
  }
  let photoPath: string | undefined;
  const photo = form.get("photo");
  if (photo instanceof File && (photo.size || photo.name)) {
    try { photoPath = await uploadReportPhoto(client.storage.from("item-photos"), user.id, photo); }
    catch (error) { return { errors: { photo: error instanceof Error ? error.message : "Photo could not be read." } }; }
  }
  const payload = { ...values, occurred_at, contact_method: contactMethod, preferred_station_id: preferredStation || null, ...(point ? { location: `SRID=4326;POINT(${point.longitude} ${point.latitude})` } : {}), ...(photoPath ? { photo_path: photoPath } : {}) };
  const query = id ? client.from("items").update(payload).eq("id", id) : client.from("items").insert({ ...payload, kind });
  const { data, error } = await query.select("id").single();
  if (error || !data) {
    if (photoPath && !await removeReportPhoto(client.storage.from("item-photos"), photoPath)) console.error("Unattached report photo cleanup failed.");
    return { errors: { form: "Report could not be saved. Please try again; your entries are kept." } };
  }
  if (photoPath && existing?.photo_path && existing.photo_path !== photoPath && !await removeReportPhoto(client.storage.from("item-photos"), existing.photo_path)) {
    console.error("Replaced report photo cleanup failed.");
  }
  revalidatePath("/my");
  revalidatePath(`/items/${data.id}`);
  redirect(`/items/${data.id}`);
}

// Guest submission: no account needed. Reports go to staff review and are never published directly.
export async function submitGuestReport(kind: string, form: FormData): Promise<{ errors: Record<string, string> }> {
  if (kind !== "found") return { errors: { form: "Lost reports need an account. Sign in to report a lost item." } };
  if (String(form.get("website") ?? "")) return { errors: { form: "This report could not be submitted." } };
  const { values, point, occurred_at, errors } = validateReport(form);
  const contact = String(form.get("contact_method") ?? "").trim();
  if (!contact || contact.length > 250) errors.contact_method = "Add an email or phone number so station staff can reach you.";
  if (!point) errors.location = "Place a pin on the map.";
  const station = String(form.get("preferred_station_id") ?? "");
  if (station && !isUuid(station)) errors.preferred_station_id = "Choose a valid station.";
  if (Object.keys(errors).length) return { errors };
  const client = await createClient();
  const { data, error } = await client.rpc("submit_guest_report", {
    p_kind: kind,
    p_title: values.title,
    p_category: values.category,
    p_color: values.color,
    p_description: values.description,
    p_location_text: values.location_text,
    p_occurred_at: occurred_at,
    p_contact_method: contact,
    p_latitude: point!.latitude,
    p_longitude: point!.longitude,
    p_private_details: values.private_details || null,
    p_station: station || null,
    p_website: null,
  });
  if (error || !data) return { errors: { form: "The report could not be submitted. Please try again; your entries are kept." } };
  redirect(`/report/received?ref=${encodeURIComponent(String(data))}`);
}
