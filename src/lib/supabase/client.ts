"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

export function createClient(detectSessionInUrl = true) {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key, detectSessionInUrl ? undefined : { isSingleton: false, auth: { detectSessionInUrl: false } });
}
