import { AccountError, accountProblemOf, type AccountProblem } from './account-problem';
import { UploadError } from './upload-problem';

/** The error to throw for a failed Auth call, logging one the page does not know. */
export function authError(error: Parameters<typeof accountProblemOf>[0]): AccountError {
  const problem = accountProblemOf(error);
  if (problem === 'not-accepting') {
    console.warn(`Para did not accept the request (HTTP ${error.status}):`, error.message);
  }
  return new AccountError(problem, error.message);
}

/** The AccountError for a failure while making sure the phone has a user to make an account of. */
export function accountErrorOf(error: unknown): AccountError {
  if (error instanceof AccountError) return error;
  if (error instanceof UploadError) {
    const problems: Partial<Record<UploadError['problem'], AccountProblem>> = {
      offline: 'offline',
      'check-failed': 'check-failed',
      unavailable: 'unavailable',
    };
    return new AccountError(problems[error.problem] ?? 'not-accepting', error.message);
  }
  throw error;
}
