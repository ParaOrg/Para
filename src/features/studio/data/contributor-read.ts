import * as z from 'zod/mini';

import { requireSupabase } from './supabase';

export interface ContributorInfo {
  /** Every upload the phone has sent that Para still holds, hidden ones too. */
  uploadCount: number;
  blockedAt: number | null;
  blockNote: string;
}

const blockSchema = z.nullable(
  z.object({ blocked_at: z.nullable(z.string()), block_note: z.nullable(z.string()) }),
);

/** One phone: how many uploads came from it, and whether it is blocked. Editors only. */
export async function fetchContributor(contributorId: string): Promise<ContributorInfo> {
  const client = requireSupabase();
  const [phone, uploads] = await Promise.all([
    client
      .from('contributor')
      .select('blocked_at, block_note')
      .eq('id', contributorId)
      .maybeSingle(),
    client
      .from('contribution')
      .select('id', { count: 'exact', head: true })
      .eq('contributor_id', contributorId),
  ]);
  if (phone.error) throw new Error(`The phone could not be read: ${phone.error.message}`);
  if (uploads.error)
    throw new Error(`The phone's uploads could not be counted: ${uploads.error.message}`);
  const block = blockSchema.parse(phone.data);
  return {
    uploadCount: uploads.count ?? 0,
    blockedAt: block?.blocked_at ? Date.parse(block.blocked_at) : null,
    blockNote: block?.block_note ?? '',
  };
}
