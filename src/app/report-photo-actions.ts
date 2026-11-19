"use server";

import { getViewer } from "@/lib/supabase/server";
import { isUuid, type Report } from "@/lib/reports";
import { signReportPhoto } from "@/lib/report-photos";

export async function refreshReportPhotoUrl(itemId: string) {
  if (!isUuid(itemId)) return null;
  const { client, user } = await getViewer();
  if (!user) return null;
  const { data, error } = await client.rpc("item_detail", { target_id: itemId });
  const report = data?.[0] as Report | undefined;
  if (error || !report?.photo_path) return null;
  return signReportPhoto(client.storage.from("item-photos"), report.photo_path);
}
