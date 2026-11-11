import { requireClient } from './require-client';
import { UploadError, problemOf, signInProblemOf, type DatabaseError } from './upload-problem';

/** The error to throw for a database answer, logging one the page does not know. */
export function answerError(error: DatabaseError, status: number): UploadError {
  const problem = problemOf(error, status);
  if (problem === 'not-accepting') {
    console.warn(`Para did not accept the request (HTTP ${status}):`, error.message);
  }
  return new UploadError(problem, error.message);
}

/**
 * The phone's anonymous identity, signing in on first use. `captchaToken` is the
 * Turnstile answer, needed once Supabase asks for one.
 */
export async function ensureSignedIn(captchaToken?: string): Promise<string> {
  const client = await requireClient();
  const { data } = await client.auth.getSession();
  if (data.session) return data.session.user.id;
  const signedIn = await client.auth.signInAnonymously(
    captchaToken ? { options: { captchaToken } } : undefined,
  );
  if (signedIn.error) {
    const problem = signInProblemOf(signedIn.error);
    if (problem === 'not-accepting') {
      console.warn(
        `Signing in was refused (HTTP ${signedIn.error.status}):`,
        signedIn.error.message,
      );
    }
    throw new UploadError(problem, `Signing in failed: ${signedIn.error.message}`);
  }
  if (!signedIn.data.user) {
    console.warn('Signing in answered with no user.');
    throw new UploadError('not-accepting', 'Signing in failed: no user');
  }
  return signedIn.data.user.id;
}

/**
 * The phone's identity now, or null when no one is signed in. A session that could not be renewed
 * for want of signal (an expired token, offline) is no answer, not no session: that throws as
 * offline, so a send waits for the signal rather than saying the account is signed out.
 */
export async function currentIdentity(): Promise<string | null> {
  const client = await requireClient();
  const { data, error } = await client.auth.getSession();
  if (error && signInProblemOf(error) === 'offline') {
    throw new UploadError('offline', `The session could not be renewed: ${error.message}`);
  }
  return data.session?.user.id ?? null;
}
