"use client";

import { useEffect } from "react";

export default function InviteRedirect() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (["invite", "recovery"].includes(hash.get("type") ?? "") && hash.has("access_token")) {
      window.location.replace(`/auth/setup${window.location.hash}`);
    }
  }, []);
  return null;
}
