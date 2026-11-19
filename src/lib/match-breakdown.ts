export type MatchSignalBreakdown = {
  key: string;
  label: string;
  weight: number;
  similarity: number | null;
  contribution: number | null;
  reason: string;
};

export const shouldAnimateMatchBreakdown = (reducedMotion: boolean) => !reducedMotion;

export function presentMatchBreakdown(signals: readonly MatchSignalBreakdown[]) {
  const availableWeight = signals.reduce((sum, signal) => sum + (signal.similarity === null ? 0 : signal.weight), 0);
  return signals.map(signal => {
    const maxPoints = signal.similarity === null || !availableWeight ? null : signal.weight / availableWeight * 100;
    const barPercent = signal.contribution === null || maxPoints === null || !maxPoints
      ? null
      : Math.max(0, Math.min(100, signal.contribution / maxPoints * 100));
    return { ...signal, maxPoints, barPercent };
  });
}

export function formatMatchPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
