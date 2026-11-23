import { AccountError } from './account-problem';
import type { ContributeClient } from './contribute-client';
import { requireClient } from './require-client';
import { UploadError } from './upload-problem';

/**
 * The page's client for a call the Account pages wait on. Its code not loading is offline; no
 * database at all is unavailable.
 */
export async function accountClient(): Promise<ContributeClient> {
  try {
    return await requireClient();
  } catch (error) {
    if (error instanceof UploadError && error.problem === 'offline') {
      throw new AccountError('offline', error.message);
    }
    throw new AccountError('unavailable', String(error));
  }
}
