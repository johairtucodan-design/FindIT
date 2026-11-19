"use client";

import { useEffect, useState } from "react";
import { formatMatchPoints, presentMatchBreakdown, shouldAnimateMatchBreakdown, type MatchSignalBreakdown } from "@/lib/match-breakdown";

export default function MatchBreakdown({ signals, category, color, date, description }: {
  signals: readonly MatchSignalBreakdown[];
  category: string;
  color: string;
  date: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const rows = presentMatchBreakdown(signals);

  useEffect(() => {
    if (!open || revealed) return;
    if (!shouldAnimateMatchBreakdown(window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      setRevealed(true);
      return;
    }
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, [open, revealed]);

  return <details className="match-details" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>View score breakdown</summary>
    <div className="match-detail-body">
      <div className="match-attributes"><span>Category: {category || "Not listed"}</span><span>Color: {color || "Not listed"}</span><span>Date: {date || "Not listed"}</span></div>
      <p className="match-public-copy">{description || "No public description provided."}</p>
      <dl className="match-breakdown">
        {rows.map(signal => <div key={signal.key}>
          <dt>{signal.label}<span>{signal.weight}% base weight</span></dt>
          {signal.contribution !== null && signal.maxPoints !== null ? <>
            <dd className="match-breakdown-points">{formatMatchPoints(signal.contribution)} / {formatMatchPoints(signal.maxPoints)} weighted points</dd>
            <dd className="match-signal-track" role="progressbar" aria-label={`${signal.label} weighted contribution`} aria-valuemin={0} aria-valuemax={signal.maxPoints} aria-valuenow={signal.contribution} aria-valuetext={`${formatMatchPoints(signal.contribution)} of ${formatMatchPoints(signal.maxPoints)} weighted points; ${signal.similarity}% signal similarity`}>
              <span style={{ width: `${revealed ? signal.barPercent : 0}%` }}/>
            </dd>
            <dd className="match-breakdown-reasons"><span>{signal.reason}</span><span>Signal similarity: {signal.similarity}%</span></dd>
          </> : <>
            <dd className="match-breakdown-unavailable">{signal.similarity === null
              ? `Unavailable: ${signal.reason.toLowerCase()}.`
              : `${signal.reason} · Signal similarity: ${signal.similarity}%. Weighted points are unavailable because there are not enough comparison details.`}</dd>
          </>}
        </div>)}
      </dl>
      <p className="muted text-xs">Available weights are renormalized. The total is a similarity score, not a probability or confirmed match. Approximate area is compared privately and never shown here.</p>
    </div>
  </details>;
}
