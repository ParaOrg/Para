import * as z from 'zod/mini';

import { accountClient } from './account-client';
import { callRpc } from './call-rpc';

const usesSchema = z.array(
  z.object({ contribution_id: z.string(), kind: z.string(), name: z.string() }),
);

/** What each ride became on the map, by ride id: route directions and hintuans, by name. */
export type MyUses = ReadonlyMap<string, readonly string[]>;

/** get_my_uses' rows, grouped by ride; an empty map when they are not in the form expected. */
export function myUsesOf(data: unknown): MyUses {
  const rows = usesSchema.safeParse(data);
  const uses = new Map<string, string[]>();
  if (!rows.success) return uses;
  for (const row of rows.data) {
    const names = uses.get(row.contribution_id) ?? [];
    if (!names.includes(row.name)) names.push(row.name);
    uses.set(row.contribution_id, names);
  }
  return uses;
}

/**
 * Which of the signed-in contributor's rides an editor used, and for what. Any failure, the
 * function not applied yet included, is no uses to show: the cards say nothing rather than fail.
 */
export async function fetchMyUses(): Promise<MyUses> {
  const result = await callRpc(await accountClient(), 'get_my_uses');
  return result.kind === 'answer' ? myUsesOf(result.data) : new Map();
}
