"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { preparePhoto } from "@/lib/photo";
import { editable, isUuid, validateReport } from "@/lib/reports";

export async function saveReport(kind: string, id: string | null, form: FormData): Promise<{ errors: Record<string, string> }> {
  const { values, occurred_at, errors } = validateReport(form);
  if (kind !== "lost" && kind !== "found") errors.form = "Invalid report type.";
  if (id && !isUuid(id)) errors.form = "Invalid report ID.";
  if (Object.keys(errors).length) return { errors };
  const client = await createClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return { errors: { form: "Your session expired. Sign in in another tab, then try saving again." } };
  if (id) {
    const { data, error } = await client.rpc("item_detail", { target_id: id });
    const report = data?.[0];
    if (error || !report || report.reporter_id !== user.id || report.kind !== kind || !editable(report.status)) {
      return { errors: { form: "You cannot edit this report. It may have entered police custody." } };
    }
  }
  let photoPath: string | undefined;
  const photo = form.get("photo");
  if (photo instanceof File && (photo.size || photo.name)) {
    let bytes: Buffer;
    try { bytes = await preparePhoto(photo); }
    catch (error) { return { errors: { photo: error instanceof Error ? error.message : "Photo could not be read." } }; }
    photoPath = `${user.id}/${crypto.randomUUID()}.webp`;
    const { error } = await client.storage.from("item-photos").upload(photoPath, bytes, { contentType: "image/webp", upsert: false });
    if (error) return { errors: { photo: "Photo upload failed. Please try again. Your report has not been saved." } };
  }
  const payload = { ...values, occurred_at, ...(photoPath ? { photo_path: photoPath } : {}) };
  const query = id ? client.from("items").update(payload).eq("id", id) : client.from("items").insert({ ...payload, kind });
  const { data, error } = await query.select("id").single();
  if (error || !data) {
    if (photoPath) await client.storage.from("item-photos").remove([photoPath]);
    return { errors: { form: "Report could not be saved. Please try again; your entries are kept." } };
  }
  revalidatePath("/my");
  revalidatePath(`/items/${data.id}`);
  redirect(`/items/${data.id}`);
}
