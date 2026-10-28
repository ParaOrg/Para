import type { SupabaseClient } from '@supabase/supabase-js';

import { signedInAccount, type Account } from './account';
import { accountErrorOf, authError } from './account-errors';
import { AccountError } from './account-problem';
import type { ContributeClient } from './contribute-client';
import { requireClient } from './require-client';
import { ensureSignedIn } from './upload-contribution';

export interface SignUpInput {
  name: string;
  email: string;
  /** Already in the form the database stores: +639XXXXXXXXX. */
  phone: string;
  password: string;
  captchaToken?: string;
}

/** The profile's name and number, stored on the contributor row. Needs an account's session. */
async function sendProfile(
  client: ContributeClient,
  { name, phone }: Pick<SignUpInput, 'name' | 'phone'>,
): Promise<void> {
  // TODO: typed rpc once 01 is applied and database types are regenerated.
  const untyped: SupabaseClient = client;
  const { error, status } = await untyped.rpc('set_profile', { name, phone });
  if (error) {
    if (status === 0) throw new AccountError('offline', error.message);
    console.warn(`Para did not take the profile (HTTP ${status}):`, error.message);
    throw new AccountError('profile-not-saved', error.message);
  }
}

/**
 * Makes an account of this phone: its anonymous user becomes a permanent one with the same id, so
 * every upload the phone already sent is the account's at once. If only the profile then fails,
 * the account stays and `saveProfile` finishes it.
 */
export async function signUp(input: SignUpInput): Promise<Account> {
  try {
    await ensureSignedIn(input.captchaToken);
    const client = await requireClient();
    const { error } = await client.auth.updateUser({
      email: input.email,
      password: input.password,
    });
    if (error) throw authError(error);
    await sendProfile(client, input);
    return await signedInAccount(client);
  } catch (error) {
    throw accountErrorOf(error);
  }
}

/** Finishes an account that has none: stores the name and number. Its email is already set. */
export async function saveProfile(input: Pick<SignUpInput, 'name' | 'phone'>): Promise<Account> {
  try {
    const client = await requireClient();
    await sendProfile(client, input);
    return await signedInAccount(client);
  } catch (error) {
    throw accountErrorOf(error);
  }
}
