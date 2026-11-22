export type PinConfirmation = { id: string; name: string; stationName: string };
export type PinActionResult = { error?: string; success?: string; pin?: unknown };

export function pinSaveFeedback(result: PinActionResult) {
  if (result.error) return { kind: "error" as const, message: result.error };
  if (!result.success || !result.pin || typeof result.pin !== "object") return null;
  const pin = result.pin as Record<string, unknown>;
  if (typeof pin.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pin.id)) return null;
  if (typeof pin.name !== "string" || !pin.name.trim() || typeof pin.stationName !== "string" || !pin.stationName.trim()) return null;
  return { kind: "success" as const, pin: { id: pin.id, name: pin.name.trim(), stationName: pin.stationName.trim() } };
}

export function pinPreviewHref(pin: PinConfirmation) {
  return `/stations?location=${encodeURIComponent(pin.id)}#station-map`;
}
