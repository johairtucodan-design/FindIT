import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
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
          // Server Components cannot set cookies; proxy refreshes the session.
        }
      },
    },
  });
}

// Deduplicate the verified user lookup only within the current render request.
export const getViewer = cache(async () => {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return { client, user: error ? null : user };
});
