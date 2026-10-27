/**
 * Why an upload or a delete did not go through.
 * - `offline`: no answer; the same request will be tried again.
 * - `day-cap`: 20 uploads in 24 hours; tried again later.
 * - `refused`: the database will never take this recording as it is.
 * - `blocked`: this phone may not upload.
 * - `check-failed`: the bot check was not passed; tried again on the next attempt.
 * - `unavailable`: this build has no database to upload to.
 * - `not-accepting`: ParaPo answered, but not in a way the page knows; most likely
 *   its settings turn uploads away. Tried again later.
 */
export type UploadProblem =
  'offline' | 'day-cap' | 'refused' | 'blocked' | 'check-failed' | 'unavailable' | 'not-accepting';

export class UploadError extends Error {
  readonly problem: UploadProblem;
  constructor(problem: UploadProblem, detail: string) {
    super(detail);
    this.name = 'UploadError';
    this.problem = problem;
  }
}

export interface DatabaseError {
  code?: string;
  message: string;
}

/**
 * Sorts a database error into what the page does next. `status` is the HTTP
 * status, 0 when no answer came back: only that is no signal. An answer the page
 * does not know is ParaPo not accepting uploads, so a settings mistake is not
 * mistaken for a phone without signal.
 */
export function problemOf(error: DatabaseError, status: number): UploadProblem {
  if (status === 0) return 'offline';
  if (error.code === 'P0001') return error.message.startsWith('day_cap') ? 'day-cap' : 'refused';
  if (error.code === '42501') return 'blocked';
  if (error.code === '23514' || error.code === '22P02' || error.code === '22023') return 'refused';
  return 'not-accepting';
}

interface SignInError {
  name: string;
  message: string;
  status?: number;
  code?: string;
}

/**
 * Sorts a failed anonymous sign-in. No answer (the fetch itself failed) is no
 * signal; any answer, such as sign-ups turned off, is ParaPo not accepting uploads.
 */
export function signInProblemOf(error: SignInError): UploadProblem {
  if (error.code === 'captcha_failed' || /captcha/i.test(error.message)) return 'check-failed';
  const isNoAnswer =
    error.name === 'TypeError' || error.name === 'AuthRetryableFetchError' || error.status === 0;
  return isNoAnswer ? 'offline' : 'not-accepting';
}
