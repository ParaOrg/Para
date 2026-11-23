import * as z from 'zod/mini';

import { AccountError } from './account-problem';
import { callRpc } from './call-rpc';
import type { ContributeClient } from './contribute-client';

/** get_profile's row as stored: null where nothing is, and both null when it answers no row. */
export interface StoredProfile {
  name: string | null;
  phone: string | null;
}

const profileRowsSchema = z.array(
  z.object({ name: z.nullable(z.string()), phone: z.nullable(z.string()) }),
);

/**
 * The signed-in account's row from get_profile. Throws AccountError: `offline` with no answer,
 * `not-accepting` for a refusal or a row not in the form expected.
 */
export async function fetchStoredProfile(
  client: ContributeClient,
  signal?: AbortSignal,
): Promise<StoredProfile> {
  const result = await callRpc(client, 'get_profile', undefined, signal);
  if (result.kind === 'failure') {
    if (result.isOffline) throw new AccountError('offline', result.message);
    console.warn(`Para did not give the profile (HTTP ${result.status}):`, result.message);
    throw new AccountError('not-accepting', result.message);
  }
  const rows = profileRowsSchema.safeParse(result.data);
  if (!rows.success)
    throw new AccountError('not-accepting', 'The profile is not in the form expected.');
  return { name: rows.data[0]?.name ?? null, phone: rows.data[0]?.phone ?? null };
}
