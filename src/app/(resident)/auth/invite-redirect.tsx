"use client";

import { useEffect } from "react";

export default function InviteRedirect() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "invite" && hash.has("access_token")) {
      window.location.replace(`/auth/setup${window.location.hash}`);
    }
  }, []);
  return null;
}
