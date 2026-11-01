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

/** Where the phone keeps whether the last account it checked had its name stored. */
const PROFILE_KEY = 'para.contributor-profile';

/** How long the page asks Supabase who is signed in before it goes by the stored session. */
const ACCOUNT_CHECK_MS = 8000;

const rememberedProfileSchema = z.object({ id: z.string(), hasProfile: z.boolean() });

/** Whether this account's name was stored when the phone last knew; null if it never knew. */
function rememberedProfile(accountId: string): boolean | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = rememberedProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.id === accountId ? parsed.data.hasProfile : null;
  } catch {
    // Unreadable or refused storage: not known, as on a phone that never checked.
    return null;
  }
}

/**
 * Keeps whether the account has its name stored, so the next opening can decide at once, before
 * Supabase answers. Signed out, nothing is kept.
 */
export function rememberProfile(account: Account | null): void {
  try {
    if (account) {
      window.localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ id: account.id, hasProfile: account.hasProfile }),
      );
    } else {
      window.localStorage.removeItem(PROFILE_KEY);
    }
  } catch (error) {
    // Refused storage (a private window): the next opening asks Supabase first, as before.
    console.warn('The phone could not keep whether the account has a name.', error);
  }
}

/**
 * The session as the phone last stored it: what the page goes by as it opens, before Supabase
 * answers, and when it cannot (no signal, a hung connection, its code not loaded). A signed-in
 * contributor can record then. Whether the profile is stored is as the phone last knew it, else
 * taken as stored.
 */
export function storedAccount(): Account | null {
  try {
    const raw = window.localStorage.getItem(CONTRIBUTOR_AUTH_KEY);
    if (!raw) return null;
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const account = accountOf(parsed.data.user, true);
    return account && { ...account, hasProfile: rememberedProfile(account.id) ?? true };
  } catch {
    // Unreadable storage is no session; signing in again replaces it.
    return null;
  }
}

const profileRowsSchema = z.array(z.object({ name: z.nullable(z.string()) }));

/**
 * Whether the signed-in account's name is stored, or null when there is no answer (no signal, or
 * the database not having get_profile yet).
 */
async function knownProfileOf(
  client: ContributeClient,
  signal?: AbortSignal,
): Promise<boolean | null> {
  const asked = client.rpc('get_profile');
  const { data, error, status } = await (signal ? asked.abortSignal(signal) : asked);
  if (error) {
    if (status !== 0)
      console.warn(`Para did not give the profile (HTTP ${status}):`, error.message);
    return null;
  }
  const rows = profileRowsSchema.safeParse(data);
  return rows.success ? Boolean(rows.data[0]?.name) : null;
}

/**
 * Whether the signed-in account's name is stored. Unknown without an answer: then yes, so a phone
 * is not shut out of recording for it.
 */
export async function hasProfileOf(client: ContributeClient): Promise<boolean> {
  return (await knownProfileOf(client)) ?? true;
}

/** The account the phone's stored session names now, or null: what a late answer is held to. */
function storedAccountId(): string | null {
  return storedAccount()?.id ?? null;
}

/**
 * Who is signed in, as Supabase says. `isWanted` is false once the answer is no longer waited
 * for (given up on, or called off by a sign-in or sign-out): then it keeps nothing.
 */
async function checkedAccount(
  isWanted: () => boolean,
  signal?: AbortSignal,
): Promise<Account | null> {
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
  if (!account) {
    if (isWanted()) rememberProfile(null);
    return null;
  }
  // A claim the last sign-in could not finish is tried again at every start, without waiting for it.
  void finishPendingClaim(client);
  const hasProfile = await knownProfileOf(client, signal);
  if (hasProfile === null) return { ...account, hasProfile: rememberedProfile(account.id) ?? true };
  const checked = { ...account, hasProfile };
  // Kept only while it is still the phone's account: a late answer never writes over another's.
  if (isWanted() && storedAccountId() === account.id) rememberProfile(checked);
  return checked;
}

/**
 * Who is signed in to an account on this phone, or null. A connection that never answers (a
 * signal that carries nothing) cannot hold it: after a while the stored session stands, and the
 * check, if it ever answers, keeps nothing. Called off by `signal`, it keeps nothing either.
 */
export async function fetchAccount(signal?: AbortSignal): Promise<Account | null> {
  let timer = 0;
  let isGivenUp = false;
  const timedOut = new Promise<Account | null>((resolve) => {
    timer = window.setTimeout(() => {
      isGivenUp = true;
      resolve(storedAccount());
    }, ACCOUNT_CHECK_MS);
  });
  try {
    return await Promise.race([
      checkedAccount(() => !isGivenUp && !(signal?.aborted ?? false), signal),
      timedOut,
    ]);
  } finally {
    window.clearTimeout(timer);
  }
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
