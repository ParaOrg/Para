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

const changedSchema = z.array(z.object({ id: z.string() }));

/**
 * Hides an upload from the studio's default view, with an optional note. The
 * server stamps who hid it and when; Show again undoes it. Nothing is deleted.
 */
export async function hideContribution(id: string, note: string): Promise<void> {
  const { data, error } = await requireSupabase()
    .from('contribution')
    .update({ hidden_at: new Date().toISOString(), hidden_note: note.trim().slice(0, 500) || null })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(`The upload was not hidden: ${error.message}`);
  if (changedSchema.parse(data).length === 0) {
    throw new Error('Nothing was hidden: it is gone, or this account may not hide uploads.');
  }
}

/** Shows a hidden upload again; who hid it, when and why are cleared. */
export async function showContribution(id: string): Promise<void> {
  const { data, error } = await requireSupabase()
    .from('contribution')
    .update({ hidden_at: null })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(`The upload was not shown again: ${error.message}`);
  if (changedSchema.parse(data).length === 0) {
    throw new Error('Nothing changed: it is gone, or this account may not show uploads again.');
  }
}
