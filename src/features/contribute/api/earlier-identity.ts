import type { SupabaseClient } from '@supabase/supabase-js';
import * as z from 'zod/mini';

import { AccountError } from './account-problem';
import { claimFailureOutcome, type ClaimOutcome } from './claim-outcome';
import {
  dropPendingClaim,
  keepPendingClaim,
  readPendingClaim,
  type PendingClaim,
} from './claim-token';
import type { ContributeClient } from './contribute-client';

const tokenSchema = z.uuid();
const movedSchema = z.int();

/** Not in the generated types until ticket 01 is applied and they are regenerated. */
const untyped = (client: ContributeClient): SupabaseClient => client;

/**
 * Whether the phone's session is its own anonymous user, with uploads of its own that signing in
 * would leave behind. A session read from storage is enough: no signal is needed to know it.
 */
async function isAnonymous(client: ContributeClient): Promise<boolean> {
  const { data } = await client.auth.getSession();
  return data.session?.user.is_anonymous === true;
}

/** One-time token for this anonymous identity's claim; it is good for 10 minutes. */
async function beginClaim(client: ContributeClient): Promise<string> {
  const { data, error, status } = await untyped(client).rpc('begin_claim');
  if (error) {
    if (status === 0) throw new AccountError('offline', error.message);
    console.warn(`ParaPo did not begin the claim (HTTP ${status}):`, error.message);
    throw new AccountError('not-accepting', error.message);
  }
  const token = tokenSchema.safeParse(data);
  if (!token.success) {
    console.warn('ParaPo gave an unexpected answer to begin_claim:', data);
    throw new AccountError('not-accepting', 'begin_claim answered with no token');
  }
  return token.data;
}

async function finishClaim(client: ContributeClient, claim: PendingClaim): Promise<ClaimOutcome> {
  // Kept as tried before the request goes: the answer may be lost after the server acted.
  keepPendingClaim({ ...claim, wasTried: true });
  const { data, error, status } = await untyped(client).rpc('finish_claim', { token: claim.token });
  if (error) return claimFailureOutcome(error, status, claim.wasTried);
  const moved = movedSchema.safeParse(data);
  if (!moved.success) {
    console.warn('ParaPo gave an unexpected answer to finish_claim:', data);
    return { kind: 'retry' };
  }
  return { kind: 'done', moved: moved.data };
}

let finishing: Promise<number> | null = null;

/**
 * Finishes the claim this phone kept, if any, as the account now signed in. Never throws: a
 * claim that cannot finish now stays for the next start. Answers how many uploads moved.
 */
export function finishPendingClaim(client: ContributeClient): Promise<number> {
  finishing ??= (async () => {
    const claim = readPendingClaim();
    if (!claim) return 0;
    const outcome = await finishClaim(client, claim);
    if (outcome.kind === 'retry') return 0;
    dropPendingClaim();
    return outcome.kind === 'done' ? outcome.moved : 0;
  })()
    .catch((error: unknown) => {
      console.warn('The claim of earlier uploads did not finish.', error);
      return 0;
    })
    .finally(() => {
      finishing = null;
    });
  return finishing;
}

/**
 * Runs a password sign-in around the phone's own anonymous identity, if it has one: while the
 * phone is still anonymous it asks `begin_claim()` for a token, signs in, then keeps the token
 * and calls `finish_claim(token)` as the account. A claim that fails then does not fail the
 * sign-in; the token stays and the next start finishes it. A phone with no identity of its own,
 * or none that is anonymous, has nothing to claim.
 */
export async function aroundEarlierIdentity<T extends { error: unknown }>(
  client: ContributeClient,
  signIn: () => Promise<T>,
): Promise<T> {
  if (!(await isAnonymous(client))) return signIn();
  const token = await beginClaim(client);
  const result = await signIn();
  if (result.error) return result;
  keepPendingClaim({ token, wasTried: false });
  await finishPendingClaim(client);
  return result;
}
