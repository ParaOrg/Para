/** A failed Supabase Auth call, as supabase-js reports it. */
interface AuthFailure {
  name?: string;
  message: string;
  status?: number;
  code?: string;
}

const RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit']);

/**
 * What the studio's sign-in screens say for a failed Auth call: what happened
 * and what to do, never Supabase's own sentence. `wrongCredentials` is the
 * screen's own words for a password that does not match. Anything else is a
 * plain sentence, and Supabase's goes to the console for whoever debugs it.
 */
export function authErrorMessage(error: AuthFailure, wrongCredentials: string): string {
  if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials')
    return wrongCredentials;
  if (error.code && RATE_LIMIT_CODES.has(error.code))
    return 'Too many tries for now. Wait a few minutes, then try again.';
  if (error.code === 'captcha_failed' || /captcha/i.test(error.message))
    return 'The check that you are not a bot did not go through. Try again.';
  // No answer at all: supabase-js names a failed fetch, with no status.
  if (error.name === 'AuthRetryableFetchError' || error.status === 0)
    return 'No connection to Para. Check your internet, then try again.';
  console.warn(`Auth refused: ${error.code ?? error.status ?? ''} ${error.message}`);
  return 'That did not go through. Try again in a moment.';
}
