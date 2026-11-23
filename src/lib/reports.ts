import { isHexColor } from "./colors.ts";

export type Report = {
  id: string;
  is_demo: boolean;
  kind: "lost" | "found";
  reporter_id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  photo_path: string | null;
  location_text: string;
  occurred_at: string;
  status: string;
  private_details: string | null;
  contact_method: string | null;
  intended_station_id: string | null;
  preferred_station_id: string | null;
  held_at_station_id: string | null;
  storage_location: string | null;
  publication_status: string;
};

export const itemCategories = ["Wallet", "Bag", "Electronics", "Keys", "Clothing", "Documents", "Jewelry", "Accessories", "Sports equipment", "Toys", "Other"] as const;
export const accountContact = (phone: string | null | undefined, email: string | null | undefined) => phone?.trim() || email?.trim() || "";

export function publicListingDraft(report: Pick<Report, "title" | "description" | "location_text">) {
  const redact = (value: string) => value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[contact removed]")
    .replace(/(?<!\w)(?:\+?63[\s().-]?)?0?9(?:[\s().-]?\d){9}(?!\w)/g, "[contact removed]")
    .trim();
  return {
    safe_title: redact(report.title).slice(0, 120),
    safe_description: redact(report.description).slice(0, 3000),
    safe_area: redact(report.location_text).slice(0, 300),
  };
}

export const statusLabel = (status: string) => status === "pending_surrender" ? "Reported — Not Received" : status === "received_by_police" ? "Received by Police" : status.split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
export const editable = (status: string) => status === "open" || status === "pending_surrender";
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function validateReport(form: FormData, previous?: Pick<Report, "category" | "color">) {
  const limits = { title: 120, category: 80, color: 80, description: 3000, location_text: 300, private_details: 3000 };
  const labels = { title: "Title", category: "Category", color: "Color", description: "Description", location_text: "Location", private_details: "Private details" };
  const values = Object.fromEntries(Object.keys(limits).map(key => [key, String(form.get(key) ?? "").trim()]));
  const errors: Record<string, string> = {};
  for (const [key, limit] of Object.entries(limits)) {
    // The map pin is the location; the landmark text is optional.
    if (!values[key] && key !== "private_details" && key !== "location_text") errors[key] = `${labels[key as keyof typeof labels]} is required.`;
    else if (values[key].length > limit) errors[key] = `Use ${limit} characters or fewer.`;
  }
  if (!values.location_text) values.location_text = "Pinned on map";
  const latitude = Number(form.get("latitude")), longitude = Number(form.get("longitude"));
  const hasPin = String(form.get("latitude") ?? "").trim() !== "" && String(form.get("longitude") ?? "").trim() !== ""
    && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  if (!hasPin) errors.location = "Place a pin on the map.";
  const point = hasPin ? { latitude, longitude } : null;
  if (values.category && !itemCategories.includes(values.category as typeof itemCategories[number]) && values.category !== previous?.category) errors.category = "Choose a category from the list.";
  if (values.color && values.color !== "Unknown" && !isHexColor(values.color) && values.color !== previous?.color) errors.color = "Choose a color from the picker or quick palette.";
  const date = String(form.get("occurred_at") ?? "");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) errors.occurred_at = "Enter a valid date.";
  else if (date > new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })) errors.occurred_at = "Date cannot be in the future.";
  return { values, point, occurred_at: Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "", errors };
}
