import * as z from 'zod/mini';

import { accountErrorOf, authError } from './account-errors';
import { AccountError, accountProblemOf } from './account-problem';
import { CONTRIBUTOR_AUTH_KEY, type ContributeClient } from './contribute-client';
import { finishPendingClaim } from './earlier-identity';
import { requireClient } from './require-client';
import { UploadError } from './upload-problem';

/** Who is signed in to an account. */
export interface Account {
  id: string;
  email: string;
  /** Whether the account's name is stored; an account made but not finished has none. */
  hasProfile: boolean;
}

const userSchema = z.object({
  id: z.string(),
  email: z.optional(z.string()),
  is_anonymous: z.optional(z.boolean()),
});

const storedSessionSchema = z.object({ user: userSchema });

/** The account a user is, or null for an anonymous user: an anonymous phone is not signed in to one. */
export function accountOf(user: unknown, hasProfile: boolean): Account | null {
  const parsed = userSchema.safeParse(user);
  if (!parsed.success || parsed.data.is_anonymous || !parsed.data.email) return null;
  return { id: parsed.data.id, email: parsed.data.email, hasProfile };
}

/**
 * The session as the phone last stored it, for when Supabase cannot answer: its token is expired
 * and cannot be renewed for want of signal, or its code did not load. A signed-in contributor can
 * still record then. Whether the profile is stored is not known, so it is taken as stored.
 */
export function storedAccount(): Account | null {
  const raw = window.localStorage.getItem(CONTRIBUTOR_AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? accountOf(parsed.data.user, true) : null;
  } catch {
    // Unreadable storage is no session; signing in again replaces it.
    return null;
  }
}

const profileRowsSchema = z.array(z.object({ name: z.nullable(z.string()) }));

/**
 * Whether the signed-in account's name is stored. Unknown without an answer (no signal, or the
 * database not having get_profile yet): then yes, so a phone is not shut out of recording for it.
 */
export async function hasProfileOf(client: ContributeClient): Promise<boolean> {
  const { data, error, status } = await client.rpc('get_profile');
  if (error) {
    if (status !== 0)
      console.warn(`Para did not give the profile (HTTP ${status}):`, error.message);
    return true;
  }
  const rows = profileRowsSchema.safeParse(data);
  return rows.success ? Boolean(rows.data[0]?.name) : true;
}

/** Who is signed in to an account on this phone, or null. */
export async function fetchAccount(): Promise<Account | null> {
  let client: ContributeClient;
  try {
    client = await requireClient();
  } catch (error) {
    // The client's code did not load: no signal. The stored session still says who this is.
    if (error instanceof UploadError && error.problem === 'offline') return storedAccount();
    throw error;
  }
  const { data, error } = await client.auth.getSession();
  if (error) return storedAccount();
  const account = accountOf(data.session?.user, true);
  if (!account) return null;
  // A claim the last sign-in could not finish is tried again at every start, without waiting for it.
  void finishPendingClaim(client);
  return { ...account, hasProfile: await hasProfileOf(client) };
}

/** The account now signed in, with its profile stored. */
export async function signedInAccount(client: ContributeClient): Promise<Account> {
  const { data } = await client.auth.getSession();
  const account = accountOf(data.session?.user, true);
  if (!account) throw new AccountError('not-accepting', 'There is no account after signing in.');
  return account;
}

/**
 * Signs out this phone only: another phone signed in to the account stays signed in. The phone's
 * own recordings stay on it, to be sent after the next sign-in.
 */
export async function signOut(): Promise<void> {
  try {
    const client = await requireClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    // Without signal the server is not told, but the phone's own session is gone all the same.
    if (error && accountProblemOf(error) !== 'offline') throw authError(error);
  } catch (error) {
    throw accountErrorOf(error);
  }
}
