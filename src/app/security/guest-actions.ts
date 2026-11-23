"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isUuid } from "@/lib/reports";

export async function reviewGuestReport(id: string, form: FormData): Promise<{ error?: string; success?: string }> {
  const { client } = await requireRole(["officer", "admin"]);
  if (!isUuid(id)) return { error: "Invalid report reference." };
  const decision = String(form.get("decision") ?? "");
  if (decision !== "reviewed" && decision !== "dismissed") return { error: "Choose a decision." };
  const { error } = await client.rpc("review_guest_report", { p_id: id, p_decision: decision });
  if (error) return { error: error.code === "42501" ? "This report is outside your station or was already decided." : "The decision could not be saved. Try again." };
  revalidatePath("/security");
  return { success: decision === "reviewed" ? "Marked as reviewed." : "Report dismissed." };
}
