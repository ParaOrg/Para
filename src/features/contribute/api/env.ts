import * as z from 'zod/mini';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.optional(z.url()),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.optional(z.string().check(z.minLength(1))),
  VITE_TURNSTILE_SITE_KEY: z.optional(z.string().check(z.minLength(1))),
});

const env = envSchema.safeParse(import.meta.env);

/** The project's address and publishable key, or null when the build has none: recordings then stay on the phone. */
export const contributeConfig: { url: string; key: string } | null =
  env.success && env.data.VITE_SUPABASE_URL && env.data.VITE_SUPABASE_PUBLISHABLE_KEY
    ? { url: env.data.VITE_SUPABASE_URL, key: env.data.VITE_SUPABASE_PUBLISHABLE_KEY }
    : null;

/** The Turnstile widget's public site key; without one, the first upload signs in with no bot check. */
export const turnstileSiteKey: string | null =
  (env.success && env.data.VITE_TURNSTILE_SITE_KEY) || null;
