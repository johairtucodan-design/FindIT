import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function createClient() {
  const { url, key } = supabaseConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; proxy refreshes them in Iteration 2.
        }
      },
    },
  });
}
