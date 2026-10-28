export type Report = {
  id: string;
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
};

export const statusLabel = (status: string) => status.split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
export const editable = (status: string) => status === "open" || status === "pending_surrender";
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function validateReport(form: FormData) {
  const limits = { title: 120, category: 80, color: 80, description: 3000, location_text: 300, private_details: 3000 };
  const labels = { title: "Title", category: "Category", color: "Color", description: "Description", location_text: "Location", private_details: "Private details" };
  const values = Object.fromEntries(Object.keys(limits).map(key => [key, String(form.get(key) ?? "").trim()]));
  const errors: Record<string, string> = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (!values[key] && key !== "private_details") errors[key] = `${labels[key as keyof typeof labels]} is required.`;
    else if (values[key].length > limit) errors[key] = `Use ${limit} characters or fewer.`;
  }
  const date = String(form.get("occurred_at") ?? "");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) errors.occurred_at = "Enter a valid date.";
  else if (date > new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })) errors.occurred_at = "Date cannot be in the future.";
  return { values, occurred_at: Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "", errors };
}
