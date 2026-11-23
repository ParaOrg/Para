import * as z from 'zod/mini';

/**
 * Cloudflare Turnstile's site key: public by design, like the publishable key.
 * Without one the studio's sign-in sends no check; with one, every
 * sign-in and password-reset request carries a token, which Supabase demands
 * once its CAPTCHA setting is on.
 */
export const turnstileSiteKey: string | null =
  z.optional(z.string().check(z.minLength(1))).parse(import.meta.env.VITE_TURNSTILE_SITE_KEY) ??
  null;

const nonEmpty = z.string().check(z.minLength(1));

/**
 * A value, or null when it is missing or empty. Never a throw: this runs as
 * the page loads, and a throw there leaves a white page (supabase.ts).
 */
function valueOrNull(value: unknown): string | null {
  const parsed = nonEmpty.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The Supabase project's address, or null when the build has none (supabase.ts says so). */
export const supabaseUrl: string | null = valueOrNull(import.meta.env.VITE_SUPABASE_URL);

/** Its publishable key: public by design, protected by row level security. */
export const supabasePublishableKey: string | null = valueOrNull(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Contributors' uploads: the Contributors map reads them. Off until the owner
 * has applied the contributions migration and turned on anonymous sign-ins;
 * with it off the Contributors map stays a placeholder and nothing asks for a
 * table the project may not have. VITE_CONTRIBUTIONS=1 turns it on, on this
 * page and the contributor page alike.
 */
export const CONTRIBUTIONS: boolean =
  z.optional(z.enum(['0', '1'])).parse(import.meta.env.VITE_CONTRIBUTIONS) === '1';
