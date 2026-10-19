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
