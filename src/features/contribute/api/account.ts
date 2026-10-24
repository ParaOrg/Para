import type { SupabaseClient } from '@supabase/supabase-js';
import * as z from 'zod/mini';

import { AccountError, accountProblemOf, type AccountProblem } from './account-problem';
import { CONTRIBUTOR_AUTH_KEY, type ContributeClient } from './contribute-client';
import { aroundEarlierIdentity } from './earlier-identity';
import { requireClient } from './require-client';
import { ensureSignedIn } from './upload-contribution';
import { UploadError } from './upload-problem';

/** Who is signed in to an account. */
export interface Account {
  id: string;
  email: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  /** Already in the form the database stores: +639XXXXXXXXX. */
  phone: string;
  password: string;
  captchaToken?: string;
}

export interface SignInInput {
  email: string;
  password: string;
  captchaToken?: string;
}

const userSchema = z.object({
  id: z.string(),
  email: z.optional(z.string()),
  is_anonymous: z.optional(z.boolean()),
});

const storedSessionSchema = z.object({ user: userSchema });

/** The account a user is, or null for an anonymous user: an anonymous phone is not signed in to one. */
function accountOf(user: unknown): Account | null {
  const parsed = userSchema.safeParse(user);
  if (!parsed.success || parsed.data.is_anonymous || !parsed.data.email) return null;
  return { id: parsed.data.id, email: parsed.data.email };
}

/**
 * The session as the phone last stored it. Supabase answers no session while its token is
 * expired and cannot be renewed for want of signal; a signed-in contributor can still record then.
 */
function storedAccount(): Account | null {
  const raw = window.localStorage.getItem(CONTRIBUTOR_AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? accountOf(parsed.data.user) : null;
  } catch {
    // Unreadable storage is no session; signing in again replaces it.
    return null;
  }
}

/** Who is signed in to an account on this phone, or null. Reads the stored session; asks no one. */
export async function fetchAccount(): Promise<Account | null> {
  const client = await requireClient();
  const { data, error } = await client.auth.getSession();
  if (error) return storedAccount();
  return accountOf(data.session?.user);
}

/** The error to throw for a failed Auth call, logging one the page does not know. */
function authError(error: Parameters<typeof accountProblemOf>[0]): AccountError {
  const problem = accountProblemOf(error);
  if (problem === 'not-accepting') {
    console.warn(`ParaPo did not accept the request (HTTP ${error.status}):`, error.message);
  }
  return new AccountError(problem, error.message);
}

/** The AccountError for a failure while making sure the phone has a user to make an account of. */
function accountErrorOf(error: unknown): AccountError {
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

/** The profile's name and number, stored on the contributor row. Needs a permanent user's token. */
async function saveProfile(
  client: ContributeClient,
  { name, phone }: Pick<SignUpInput, 'name' | 'phone'>,
): Promise<void> {
  // The generated types do not know set_profile until ticket 01's migration is applied and they
  // are regenerated; until then the call goes through the client's untyped face. Its answer is
  // void, so nothing needs parsing.
  const untyped: SupabaseClient = client;
  const { error, status } = await untyped.rpc('set_profile', { name, phone });
  if (error) {
    if (status === 0) throw new AccountError('offline', error.message);
    console.warn(`ParaPo did not take the profile (HTTP ${status}):`, error.message);
    throw new AccountError('profile-not-saved', error.message);
  }
}

/**
 * Makes an account of this phone: its anonymous user becomes a permanent one with the same id, so
 * every upload the phone already sent is the account's at once. Safe to repeat after a failure.
 */
export async function signUp(input: SignUpInput): Promise<Account> {
  try {
    await ensureSignedIn(input.captchaToken);
    const client = await requireClient();
    const { data: current } = await client.auth.getSession();
    // A repeat after the upgrade went through but the profile did not: only the profile is left.
    if (current.session?.user.is_anonymous !== false) {
      const { error } = await client.auth.updateUser({
        email: input.email,
        password: input.password,
      });
      if (error) throw authError(error);
    }
    // The token still says anonymous until it is renewed, and set_profile refuses an anonymous one.
    const { data, error } = await client.auth.refreshSession();
    if (error) throw authError(error);
    await saveProfile(client, input);
    const account = accountOf(data.user);
    if (!account) throw new AccountError('not-accepting', 'The new account has no email.');
    return account;
  } catch (error) {
    throw accountErrorOf(error);
  }
}

/** Signs in to an account made on this or another phone. */
export async function signIn(input: SignInInput): Promise<Account> {
  try {
    const client = await requireClient();
    const { data, error } = await aroundEarlierIdentity(() =>
      client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
        options: input.captchaToken ? { captchaToken: input.captchaToken } : undefined,
      }),
    );
    if (error) throw authError(error);
    const account = accountOf(data.user);
    if (!account) throw new AccountError('not-accepting', 'The account has no email.');
    return account;
  } catch (error) {
    throw accountErrorOf(error);
  }
}

/** Signs out. The phone's own recordings stay on it, to be sent after the next sign-in. */
export async function signOut(): Promise<void> {
  try {
    const client = await requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw authError(error);
  } catch (error) {
    throw accountErrorOf(error);
  }
}
