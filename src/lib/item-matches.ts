type MatchFields = {
  id?: string;
  category: string;
  title: string;
  description?: string | null;
  color: string;
  location_text: string;
  occurred_at: string;
  coordinates?: readonly [latitude: number, longitude: number] | null;
};

const dayMs = 86_400_000;
export const matchWindowMs = 30 * dayMs;
const stopWords = new Set(["a", "an", "and", "at", "for", "found", "in", "item", "lost", "missing", "my", "of", "on", "the", "to"]);
const unknownColors = new Set(["", "unknown", "not sure", "n a", "none"]);

function terms(...values: Array<string | null | undefined>) {
  const words = values.flatMap(value => (value?.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]+/gu) ?? []));
  return new Set(words.filter(word => word.length > 1 && !stopWords.has(word)));
}

function normalize(value: string | null | undefined) {
  return (value?.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]+/gu) ?? []).join(" ");
}

function dice(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  return 2 * shared / (left.size + right.size);
}

function validCoordinates(value: MatchFields["coordinates"]): value is readonly [number, number] {
  return Boolean(value && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180);
}

function distanceKm(a: readonly [number, number], b: readonly [number, number]) {
  const rad = Math.PI / 180, lat1 = a[0] * rad, lat2 = b[0] * rad;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function rankItemMatches<T extends MatchFields>(lost: MatchFields, candidates: T[]) {
  const category = normalize(lost.category);
  const lostText = terms(lost.title, lost.description);
  const lostArea = terms(lost.location_text);
  const date = Date.parse(lost.occurred_at);

  return candidates.flatMap(candidate => {
    const candidateDate = Date.parse(candidate.occurred_at);
    const dateDifference = Math.abs(candidateDate - date);
    if (!category || normalize(candidate.category) !== category || !Number.isFinite(dateDifference) || dateDifference > matchWindowMs) return [];

    const candidateText = terms(candidate.title, candidate.description);
    const sharedTerms = [...lostText].filter(word => candidateText.has(word)).sort();
    let score = 30 + 10 * Math.max(0, 1 - dateDifference / matchWindowMs);
    const days = Math.floor(dateDifference / dayMs);
    const reasons = ["Same category", days === 0 ? "Same date" : `${days} ${days === 1 ? "day" : "days"} apart`];
    if (lostText.size && candidateText.size) {
      score += 35 * dice(lostText, candidateText);
      if (sharedTerms.length) reasons.push(`Shared terms: ${sharedTerms.slice(0, 4).join(", ")}`);
    }

    const normalizedColor = normalize(lost.color), candidateNormalizedColor = normalize(candidate.color);
    const knownColor = !unknownColors.has(normalizedColor) && Boolean(normalizedColor);
    const candidateHasColor = !unknownColors.has(candidateNormalizedColor) && Boolean(candidateNormalizedColor);
    if (knownColor && candidateHasColor) {
      const sameColor = normalizedColor === candidateNormalizedColor;
      if (sameColor) score += 15;
      if (sameColor) reasons.push("Same color");
    }

    if (validCoordinates(lost.coordinates) && validCoordinates(candidate.coordinates)) {
      const km = distanceKm(lost.coordinates, candidate.coordinates);
      score += 10 * Math.max(0, 1 - km / 50);
      reasons.push(km < 2 ? "Locations are within about 2 km" : km < 10 ? "Locations are within about 10 km" : km < 50 ? "Locations are within about 50 km" : "Locations are more than 50 km apart");
    } else {
      const candidateArea = terms(candidate.location_text);
      if (lostArea.size && candidateArea.size) {
        score += 10 * dice(lostArea, candidateArea);
        if ([...lostArea].some(word => candidateArea.has(word))) reasons.push("Area terms overlap");
      }
    }

    return [{ candidate, score: Math.round(score), reasons, dateDifference }];
  }).sort((a, b) => b.score - a.score || a.dateDifference - b.dateDifference || (a.candidate.id ?? "").localeCompare(b.candidate.id ?? "")).slice(0, 5);
}
