/**
 * Turnstile's server-side check: Cloudflare says whether the token came from a solved challenge.
 * The sender's address is not passed (siteverify's `remoteip` is optional), so it never leaves
 * this request.
 */

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteverifyAnswer {
  success?: unknown;
}

export async function isTurnstileVerified(
  secret: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetcher(SITEVERIFY, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!response.ok) return false;
    const answer: SiteverifyAnswer = await response.json();
    return answer.success === true;
  } catch {
    // Unreachable or unreadable: unverified, never let through.
    return false;
  }
}
