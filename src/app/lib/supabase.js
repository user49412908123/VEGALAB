import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Avoid leaking secrets; just warn so developer knows env vars are missing.
    // In demo mode vegalabData.readTable will fall back to demo data.
    // Do NOT log secret values.
    // eslint-disable-next-line no-console
    console.warn("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Falling back to demo data.");
  }
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
