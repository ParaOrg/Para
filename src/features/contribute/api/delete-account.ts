import type { SupabaseClient } from '@supabase/supabase-js';

import { accountErrorOf } from './account-errors';
import { AccountError } from './account-problem';
import { recordingsOfAccount } from './account-recordings';
import { dropPendingClaim } from './claim-token';
import { CONTRIBUTOR_AUTH_KEY } from './contribute-client';
import { requireClient } from './require-client';
import { deleteRecording, loadRecordings } from '../storage/recording-store';

/**
 * Deletes the signed-in account from Para, with everything of it there: its profile, its uploads
 * with their points and hintos, and its lifetime stats (delete_my_account). Then forgets it on
 * this phone: the session, an unfinished claim, the answers kept for it, and its recordings
 * (recordingsOfAccount). Needs signal; nothing is forgotten on the phone unless Para deleted it.
 * Not while a recording is running: the screen calls it from Account settings only.
 */
export async function deleteAccount(): Promise<void> {
  let accountId: string;
  try {
    const client = await requireClient();
    const { data: auth } = await client.auth.getSession();
    if (!auth.session) throw new AccountError('not-deletable', 'No account is signed in.');
    accountId = auth.session.user.id;
    // TODO: typed rpc once delete_my_account is applied and database types are regenerated.
    const untyped: SupabaseClient = client;
    const { error, status } = await untyped.rpc('delete_my_account');
    if (error) {
      if (status === 0) throw new AccountError('offline', error.message);
      // An anonymous phone, an editor, or an account that still owns rows of the map.
      if (error.code === '42501' || error.message.startsWith('owns_map_rows')) {
        throw new AccountError('not-deletable', error.message);
      }
      console.warn(`Para did not delete the account (HTTP ${status}):`, error.message);
      throw new AccountError('not-accepting', error.message);
    }
    // The user is gone, so the server would refuse a sign-out: this phone's own session goes.
    await client.auth.signOut({ scope: 'local' });
  } catch (error) {
    throw accountErrorOf(error);
  }
  await forgetAccountOnPhone(accountId);
}

/** Everything this phone kept for the account, once Para has deleted it. */
async function forgetAccountOnPhone(accountId: string): Promise<void> {
  try {
    localStorage.removeItem(CONTRIBUTOR_AUTH_KEY);
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith(`.${accountId}`)) localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('The phone could not clear what it kept for the deleted account.', error);
  }
  dropPendingClaim();
  try {
    const recordings = await loadRecordings();
    await Promise.all(recordingsOfAccount(recordings, accountId).map((r) => deleteRecording(r.id)));
  } catch (error) {
    // The account is gone from Para all the same; the person can still delete these one by one.
    console.warn("The phone could not delete the deleted account's recordings.", error);
  }
}
