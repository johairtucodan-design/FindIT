export const matchWeights = { category: 25, details: 30, color: 15, date: 15, area: 15 } as const;
export const matchWindowMs = 30 * 86_400_000;
export const eligibleFoundStatuses = ["pending_surrender", "received_by_police", "in_custody"] as const;

export type MatchFields = {
  id?: string;
  kind: "lost" | "found";
  status: string;
  category: string | null;
  title: string | null;
  description: string | null;
  color: string | null;
  location_text: string | null;
  occurred_at: string | null;
};

type SafeCandidate = Pick<MatchFields, "id" | "kind" | "status" | "title" | "occurred_at">;
type Signal = { weight: number; similarity: number; reason: string };

const stopWords = new Set(["a", "an", "and", "at", "for", "found", "in", "item", "lost", "missing", "my", "of", "on", "the", "to"]);
const unknownValues = new Set(["", "unknown", "not sure", "n a", "none", "not provided"]);
const foundStatuses = new Set<string>(eligibleFoundStatuses);

function normalize(value: string | null | undefined) {
  return value?.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]+/gu)?.join(" ") ?? "";
}

function tokens(value: string | null | undefined) {
  return new Set(normalize(value).split(" ").filter(word => word.length > 1 && !stopWords.has(word)));
}

function dice(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const word of left) if (right.has(word)) overlap++;
  return (2 * overlap) / (left.size + right.size);
}

function known(value: string | null | undefined) {
  const normalized = normalize(value);
  return normalized && !unknownValues.has(normalized) ? normalized : "";
}

function safeCandidate(candidate: MatchFields): SafeCandidate {
  return {
    id: candidate.id,
    kind: candidate.kind,
    status: candidate.status,
    title: candidate.title,
    occurred_at: candidate.occurred_at,
  };
}

export function rankItemMatches<T extends MatchFields>(lost: MatchFields, candidates: T[]) {
  if (lost.kind !== "lost" || lost.status !== "open") return [];
  const lostDate = Date.parse(lost.occurred_at ?? "");

  return candidates.flatMap(candidate => {
    const candidateDate = Date.parse(candidate.occurred_at ?? "");
    const hasDateSignal = Number.isFinite(lostDate) && Number.isFinite(candidateDate);
    const dateDifference = hasDateSignal ? Math.abs(candidateDate - lostDate) : null;
    if (candidate.kind !== "found" || !foundStatuses.has(candidate.status) || (dateDifference !== null && dateDifference > matchWindowMs)) return [];

    const signals: Signal[] = [];
    const categoryA = known(lost.category), categoryB = known(candidate.category);
    if (categoryA && categoryB) signals.push({ weight: matchWeights.category, similarity: categoryA === categoryB ? 1 : 0, reason: categoryA === categoryB ? "Same category" : "Different category" });

    const titleA = tokens(lost.title), titleB = tokens(candidate.title);
    const descriptionA = tokens(lost.description), descriptionB = tokens(candidate.description);
    const detailA = new Set([...titleA, ...descriptionA]), detailB = new Set([...titleB, ...descriptionB]);
    if (detailA.size && detailB.size) {
      const descriptionSimilarity = dice(descriptionA, descriptionB);
      const titleSimilarity = dice(titleA, titleB);
      const reason = descriptionSimilarity >= 0.25 ? "Similar description" : titleSimilarity >= 0.25 ? "Similar title" : "Item details differ";
      signals.push({ weight: matchWeights.details, similarity: dice(detailA, detailB), reason });
    }

    const colorA = known(lost.color), colorB = known(candidate.color);
    if (colorA && colorB) {
      const similarity = colorA === colorB ? 1 : dice(tokens(colorA), tokens(colorB));
      signals.push({ weight: matchWeights.color, similarity, reason: similarity === 1 ? "Same color" : similarity >= 0.5 ? "Similar color" : "Different color" });
    }

    if (dateDifference !== null) {
      const days = Math.floor(dateDifference / 86_400_000);
      signals.push({ weight: matchWeights.date, similarity: Math.max(0, 1 - dateDifference / matchWindowMs), reason: days === 0 ? "Reported on the same day" : `Reported ${days} ${days === 1 ? "day" : "days"} apart` });
    }

    const areaA = tokens(lost.location_text), areaB = tokens(candidate.location_text);
    if (areaA.size && areaB.size) {
      const similarity = dice(areaA, areaB);
      signals.push({ weight: matchWeights.area, similarity, reason: similarity >= 0.25 ? "Reported nearby" : "Reported areas differ" });
    }

    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    const enoughDetails = signals.length >= 3;
    const score = enoughDetails ? Math.round(signals.reduce((sum, signal) => sum + signal.weight * signal.similarity, 0) / totalWeight * 100) : null;
    const reasons = enoughDetails ? signals.map(signal => signal.reason) : ["Not enough details to compare"];
    return [{ candidate: safeCandidate(candidate), score, reasons, dateDifference, notEnoughDetails: !enoughDetails }];
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (a.dateDifference ?? Number.MAX_SAFE_INTEGER) - (b.dateDifference ?? Number.MAX_SAFE_INTEGER) || (a.candidate.id ?? "").localeCompare(b.candidate.id ?? "")).slice(0, 5);
}
