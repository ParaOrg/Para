import * as z from 'zod/mini';

import { requireSupabase } from './supabase';

/**
 * Deletes an upload from ParaPo, with its points and hintos. The contributor's
 * phone keeps its own copy. Throws when nothing was deleted: the upload was
 * already gone, or this account may not delete uploads.
 */
export async function deleteContribution(id: string): Promise<void> {
  const { data, error } = await requireSupabase()
    .from('contribution')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(`The upload was not deleted: ${error.message}`);
  if (z.array(z.object({ id: z.string() })).parse(data).length === 0) {
    throw new Error(
      'Nothing was deleted: it is already gone, or this account may not delete uploads.',
    );
  }
}
