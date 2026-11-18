export function matchScorePresentation(score: number | null) {
  return score === null
    ? { hasScore: false as const, label: "Not enough details to compare" }
    : { hasScore: true as const, score: Math.max(0, Math.min(100, Math.round(score))), label: "Similarity score" };
}

export const shouldAnimateMatchScore = (reducedMotion: boolean, supportsIntersectionObserver: boolean) => !reducedMotion && supportsIntersectionObserver;
