/**
 * Runs a password sign-in around the phone's own anonymous identity, if it has one.
 *
 * Ticket 04 fills this in: when the phone's session is anonymous it asks `begin_claim()` for a
 * one-time token before `signIn` replaces that session, and calls `finish_claim(token)` once the
 * account is signed in, keeping the token for the next start when that fails. Until then the
 * sign-in runs as it is and nothing is claimed.
 */
export function aroundEarlierIdentity<T>(signIn: () => Promise<T>): Promise<T> {
  return signIn();
}
