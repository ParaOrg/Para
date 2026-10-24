/**
 * Why signing up or signing in did not go through.
 * - `wrong-credentials`: the email and password do not match an account.
 * - `email-taken`: that email already has an account.
 * - `weak-password`: the project turned the password away as too short.
 * - `offline`: no answer; the same request can be sent again.
 * - `check-failed`: the bot check was not passed.
 * - `profile-not-saved`: the account was made but its name and number were not stored.
 * - `unavailable`: this build has no database to sign in to.
 * - `not-accepting`: ParaPo answered, but not in a way the page knows; most likely its settings.
 */
export type AccountProblem =
  | 'wrong-credentials'
  | 'email-taken'
  | 'weak-password'
  | 'offline'
  | 'check-failed'
  | 'profile-not-saved'
  | 'unavailable'
  | 'not-accepting';

export class AccountError extends Error {
  readonly problem: AccountProblem;
  constructor(problem: AccountProblem, detail: string) {
    super(detail);
    this.name = 'AccountError';
    this.problem = problem;
  }
}

/** The one line the person reads for each problem: what happened, and what to do. */
export const ACCOUNT_MESSAGES: Record<AccountProblem, string> = {
  'wrong-credentials': 'Wrong email or password',
  'email-taken': 'That email already has an account',
  'weak-password': 'Use a longer password, at least 8 characters',
  offline: "No signal — try again when you're online",
  'check-failed': 'The check that you are a person did not pass. Try again.',
  'profile-not-saved': "Your account is made, but your name and number didn't save. Try again.",
  unavailable: 'Accounts are not available on this page.',
  'not-accepting': "ParaPo can't take this right now. Try again later.",
};

interface AuthFailure {
  name: string;
  message: string;
  status?: number;
  code?: string;
}

const EMAIL_TAKEN_CODES = new Set([
  'email_exists',
  'user_already_exists',
  'identity_already_exists',
]);

/**
 * Sorts a failed Auth call. No answer (the fetch itself failed) is no signal; any
 * other answer the page does not know is ParaPo not accepting the request.
 */
export function accountProblemOf(error: AuthFailure): AccountProblem {
  if (error.code === 'invalid_credentials') return 'wrong-credentials';
  if (error.code && EMAIL_TAKEN_CODES.has(error.code)) return 'email-taken';
  if (error.code === 'weak_password') return 'weak-password';
  if (error.code === 'captcha_failed' || /captcha/i.test(error.message)) return 'check-failed';
  const isNoAnswer =
    error.name === 'TypeError' || error.name === 'AuthRetryableFetchError' || error.status === 0;
  return isNoAnswer ? 'offline' : 'not-accepting';
}
