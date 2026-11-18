"use client";

import { useEffect, useRef, useState } from "react";
import { matchScorePresentation, shouldAnimateMatchScore } from "@/lib/match-presentation";

export default function MatchScore({ score }: { score: number | null }) {
  const presentation = matchScorePresentation(score), bar = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!presentation.hasScore) return;
    const target = presentation.score;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!shouldAnimateMatchScore(reducedMotion, "IntersectionObserver" in window)) { setShown(target); return; }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now(), duration = 680;
      const animate = (now: number) => {
        const progress = Math.min(1, (now - start) / duration), eased = 1 - (1 - progress) ** 3;
        setShown(Math.round(target * eased));
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }, { threshold: .25 });
    if (bar.current) observer.observe(bar.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [score]);

  if (!presentation.hasScore) return <p className="match-score-unavailable">{presentation.label}</p>;
  return <div className="match-score-meter">
    <div className="match-score-readout"><span>SIMILARITY SCORE</span><strong aria-hidden="true">{shown}<small> / 100</small></strong></div>
    <div ref={bar} className="match-score-track" role="progressbar" aria-label="Similarity score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={presentation.score} aria-valuetext={`${presentation.score} out of 100 similarity score. Not a probability or confirmation.`}><span style={{ width: `${shown}%` }}/></div>
    <span className="sr-only">{presentation.score} out of 100 similarity score. Not a probability or confirmation.</span>
  </div>;
}
