export type GeoPoint = readonly [latitude: number, longitude: number];

export function isGeoPoint(value: unknown): value is GeoPoint {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) && Math.abs(value[0]) <= 90 &&
    typeof value[1] === "number" && Number.isFinite(value[1]) && Math.abs(value[1]) <= 180;
}

export function distanceKm(from: unknown, to: unknown): number | null {
  if (!isGeoPoint(from) || !isGeoPoint(to)) return null;
  const radians = Math.PI / 180;
  const [lat1, lon1] = from.map(value => value * radians);
  const [lat2, lon2] = to.map(value => value * radians);
  const a = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function rankNearby<T>(origin: unknown, entries: readonly T[], pointOf: (entry: T) => unknown) {
  if (!isGeoPoint(origin)) return [];
  return entries.flatMap(entry => {
    const distance = distanceKm(origin, pointOf(entry));
    return distance === null ? [] : [{ entry, distanceKm: distance }];
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}
