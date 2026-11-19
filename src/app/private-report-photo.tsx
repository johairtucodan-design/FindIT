"use client";

import { useRef, useState } from "react";
import { refreshReportPhotoUrl } from "./report-photo-actions";

export default function PrivateReportPhoto({ itemId, title, initialUrl, compact = false }: {
  itemId: string;
  title: string;
  initialUrl: string | null;
  compact?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl), [failed, setFailed] = useState(!initialUrl), [pending, setPending] = useState(false);
  const refreshed = useRef(false);

  async function retry() {
    if (pending) return;
    refreshed.current = true;
    setPending(true);
    try {
      const freshUrl = await refreshReportPhotoUrl(itemId);
      setUrl(freshUrl);
      setFailed(!freshUrl);
    } catch {
      setUrl(null);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return <div className={`private-report-photo${compact ? " compact" : ""}`}>
    {url && !failed ? <img src={url} alt={`Photo of ${title}`} onError={() => {
      if (refreshed.current) setFailed(true);
      else void retry();
    }}/> : <div className="private-photo-empty" role="status">
      <span aria-hidden="true">⌕</span>
      <strong>Photo unavailable</strong>
      <p>The private image may have expired or could not be reached.</p>
      {compact ? <p>Open the report to refresh this image.</p> : <button type="button" className="text-link" onClick={() => { refreshed.current = false; void retry(); }} disabled={pending}>
        {pending ? "Refreshing…" : "Refresh photo"}
      </button>}
    </div>}
  </div>;
}
