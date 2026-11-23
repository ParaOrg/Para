import {
  dropDeletion,
  keepDeletion,
  nextDeletionStep,
  readDeletion,
  recordingsToForget,
  type AccountDeletion,
} from './account-deletion';
import { accountErrorOf } from './account-errors';
import { AccountError } from './account-problem';
import { callRpc } from './call-rpc';
import { dropPendingClaim } from './claim-token';
import { CONTRIBUTOR_AUTH_KEY } from './contribute-client';
import { requireClient } from './require-client';
import { deleteRecording, loadRecordings } from '../storage/recording-store';
import { tellSavedRecordingsChanged } from '../storage/saved-recordings-channel';

/**
 * Deletes the signed-in account from Para (delete_my_account): its name, email, number and
 * password, and its stats. Its uploads stay on Para, unlinked, with no one's name on them. Then
 * forgets it on this phone: the session, an unfinished claim, the answers kept for it, and every
 * saved recording (recordingsToForget). Needs signal; nothing is forgotten on the phone unless
 * Para deleted it.
 *
 * Safe to repeat: the deletion is kept on the phone once Para has said yes, so clearing the phone
 * that failed is finished by the next try, even after a reload. A try whose answer was lost is
 * asked again while the session lasts: Para answers an account it already deleted as deleted.
 * With no answer kept, a lapsed session clears nothing.
 * Not while a recording is running: the screen calls it from Account settings only.
 */
export async function deleteAccount(): Promise<void> {
  let deletion: AccountDeletion;
  try {
    const client = await requireClient();
    const { data: auth } = await client.auth.getSession();
    const step = nextDeletionStep(auth.session?.user.id ?? null, readDeletion());
    if (step.kind === 'none') throw new AccountError('not-deletable', 'No account is signed in.');
    if (step.kind === 'forget') {
      deletion = step.deletion;
    } else {
      deletion = step.kept ?? { accountId: step.accountId };
      // Said every time: left out (or true), delete_my_account refuses and deletes nothing. Its
      // default stays true for the app versions that call it so; only false deletes an account.
      const result = await callRpc(client, 'delete_my_account', { delete_uploads: false });
      if (result.kind === 'failure') {
        if (result.isOffline) throw new AccountError('offline', result.message);
        // An anonymous phone, an editor, or an account that still owns rows of the map.
        if (result.code === '42501' || result.message.startsWith('owns_map_rows')) {
          dropDeletion();
          throw new AccountError('not-deletable', result.message);
        }
        console.warn(`Para did not delete the account (HTTP ${result.status}):`, result.message);
        throw new AccountError('not-accepting', result.message);
      }
      // Kept only once Para has said yes: a deletion kept before an answer that never came would
      // let a later tap, its session lapsed meanwhile, clear the phone of an account Para still has.
      keepDeletion(deletion);
    }
    // The user is gone, so the server would refuse a sign-out: this phone's own session goes.
    await client.auth.signOut({ scope: 'local' });
  } catch (error) {
    throw accountErrorOf(error);
  }
  await forgetAccountOnPhone(deletion);
}

/** Everything this phone kept for the account, once Para has deleted it. */
async function forgetAccountOnPhone(deletion: AccountDeletion): Promise<void> {
  try {
    localStorage.removeItem(CONTRIBUTOR_AUTH_KEY);
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith(`.${deletion.accountId}`)) localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('The phone could not clear what it kept for the deleted account.', error);
  }
  dropPendingClaim();
  try {
    const recordings = await loadRecordings();
    await Promise.all(recordingsToForget(recordings).map((r) => deleteRecording(r.id)));
    dropDeletion();
  } catch (error) {
    // The account is gone from Para all the same. The deletion stays kept for a later call to
    // finish; the person can also delete them one by one.
    console.warn('The phone could not delete its recordings with the deleted account.', error);
  }
  // Every list of saved recordings, this tab's own too, reads them again, whatever was deleted:
  // none of the deleted account's may show to whoever signs in next.
  tellSavedRecordingsChanged();
}
