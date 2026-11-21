"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isUuid } from "@/lib/reports";

function locationInput(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const latitude = Number(text("latitude")), longitude = Number(text("longitude"));
  if (!text("name") || text("name").length > 120) return { error: "Name is required and must be 120 characters or fewer." };
  if (!text("description") || text("description").length > 1200) return { error: "Public description is required and must be 1,200 characters or fewer." };
  if (!text("visit_instructions") || text("visit_instructions").length > 1000) return { error: "Visit instructions are required and must be 1,000 characters or fewer." };
  if (!text("latitude") || !text("longitude") || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { error: "Choose a map point or enter valid latitude and longitude values." };
  }
  return { name: text("name"), description: text("description"), visitInstructions: text("visit_instructions"), latitude, longitude };
}

async function saveLocation(target: string | null, form: FormData) {
  const { client, profile } = await requireRole(["officer"]);
  if (!profile.station_id) return { error: "Ask an administrator to assign your staff account to a public-reference station." };
  if (target && !isUuid(target)) return { error: "Invalid location reference." };
  const value = locationInput(form);
  if ("error" in value) return value;
  const { error } = target
    ? await client.rpc("update_station_location", { p_target: target, p_name: value.name, p_description: value.description, p_visit_instructions: value.visitInstructions, p_latitude: value.latitude, p_longitude: value.longitude })
    : await client.rpc("propose_station_location", { p_station: profile.station_id, p_name: value.name, p_description: value.description, p_visit_instructions: value.visitInstructions, p_latitude: value.latitude, p_longitude: value.longitude });
  if (error) return { error: error.code === "42501" ? "This pin is outside your assigned station access." : error.message || "The location could not be saved." };
  revalidatePath("/security/locations"); revalidatePath("/manager"); revalidatePath("/stations");
  return { success: target ? "Map pin updated and published." : "Map pin published and visible on FindIT." };
}

export async function proposeStationLocation(form: FormData) {
  return saveLocation(null, form);
}

export async function updateStationLocation(target: string, form: FormData) {
  return saveLocation(target, form);
}

export async function deactivateStationLocation(target: string, form: FormData) {
  const { client } = await requireRole(["officer"]);
  if (!isUuid(target)) return { error: "Invalid location reference." };
  if (form.get("confirmed") !== "on") return { error: "Confirm deactivation first." };
  const { error } = await client.rpc("deactivate_station_location", { p_target: target });
  if (error) return { error: error.code === "42501" ? "This pin is outside your assigned station access." : error.message || "The location could not be deactivated." };
  revalidatePath("/security/locations"); revalidatePath("/manager"); revalidatePath("/stations");
  return { success: "Location deactivated and removed from the public map." };
}
