import * as z from 'zod/mini';

import {
  dropDeletion,
  keepDeletion,
  nextDeletionStep,
  readDeletion,
  recordingsOfAccount,
  type AccountDeletion,
} from './account-deletion';
import { accountErrorOf } from './account-errors';
import { AccountError } from './account-problem';
import { dropPendingClaim } from './claim-token';
import { CONTRIBUTOR_AUTH_KEY, type ContributeClient } from './contribute-client';
import { requireClient } from './require-client';
import { answerError } from './upload-contribution';
import { deleteRecording, loadRecordings } from '../storage/recording-store';
import { tellSavedRecordingsChanged } from '../storage/saved-recordings-channel';

/** PostgREST's longest page, by default. */
const PAGE = 1000;

const idRowsSchema = z.array(z.object({ id: z.string() }));

/** The ids of every upload Para holds for the account, whichever identity sent it. */
async function accountUploadIds(client: ContributeClient, accountId: string): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error, status } = await client
      .from('contribution')
      .select('id')
      .eq('contributor_id', accountId)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw accountErrorOf(answerError(error, status));
    const page = idRowsSchema.parse(data).map((row) => row.id);
    ids.push(...page);
    if (page.length < PAGE) return ids;
  }
}

/**
 * Deletes the signed-in account from Para, with everything of it there: its profile, its uploads
 * with their points and hintos, and its lifetime stats (delete_my_account). Then forgets it on
 * this phone: the session, an unfinished claim, the answers kept for it, and its recordings
 * (recordingsOfAccount). Needs signal; nothing is forgotten on the phone unless Para deleted it.
 *
 * Safe to repeat: what Para held is read before asking, and kept on the phone once Para has
 * deleted it, so clearing the phone that failed is finished by the next try, even after a reload.
 * A try whose answer was lost is asked again while the session lasts: Para answers an account it
 * already deleted as deleted. With no answer kept, a lapsed session clears nothing.
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
      deletion = step.kept ?? {
        accountId: step.accountId,
        uploadIds: await accountUploadIds(client, step.accountId),
      };
      const { error, status } = await client.rpc('delete_my_account');
      if (error) {
        if (status === 0) throw new AccountError('offline', error.message);
        // An anonymous phone, an editor, or an account that still owns rows of the map.
        if (error.code === '42501' || error.message.startsWith('owns_map_rows')) {
          dropDeletion();
          throw new AccountError('not-deletable', error.message);
        }
        console.warn(`Para did not delete the account (HTTP ${status}):`, error.message);
        throw new AccountError('not-accepting', error.message);
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
    await Promise.all(recordingsOfAccount(recordings, deletion).map((r) => deleteRecording(r.id)));
    dropDeletion();
  } catch (error) {
    // The account is gone from Para all the same. The deletion stays kept for a later call to
    // finish; the person can also delete them one by one.
    console.warn("The phone could not delete the deleted account's recordings.", error);
  }
  // Every list of saved recordings, this tab's own too, reads them again, whatever was deleted:
  // none of the deleted account's may show to whoever signs in next.
  tellSavedRecordingsChanged();
}
