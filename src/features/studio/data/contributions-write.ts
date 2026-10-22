import type { SupabaseClient } from '@supabase/supabase-js';
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

// TODO: type these through the generated client once database.types.ts is
// regenerated after the contribution_use migration is applied; until then the
// table and the two functions are not in `Database`.
const untyped = (): SupabaseClient => requireSupabase();

export interface ContributionUse {
  contributionId: string;
  kind: 'direction' | 'hintuan';
  /** The direction's or the hintuan's id. */
  subjectId: string;
}

/**
 * Records which uploads a direction or a hintuan came from. A pair already
 * recorded is left as it is, so a retried save adds nothing twice.
 */
export async function recordContributionUses(uses: readonly ContributionUse[]): Promise<void> {
  if (uses.length === 0) return;
  const { error } = await untyped()
    .from('contribution_use')
    .upsert(
      uses.map((u) => ({
        contribution_id: u.contributionId,
        kind: u.kind,
        subject_id: u.subjectId,
      })),
      { onConflict: 'contribution_id,kind,subject_id', ignoreDuplicates: true },
    );
  if (error) throw new Error(`The uploads it came from were not recorded: ${error.message}`);
}

/** Blocks a phone, with an optional note: the database refuses its next uploads. */
export async function blockContributor(contributorId: string, note: string): Promise<void> {
  const { error } = await untyped().rpc('block_contributor', {
    target: contributorId,
    note: note.trim().slice(0, 500) || null,
  });
  if (error) throw new Error(`The phone was not blocked: ${error.message}`);
}

/** Lets a blocked phone upload again; who blocked it, when and why are cleared. */
export async function unblockContributor(contributorId: string): Promise<void> {
  const { error } = await untyped().rpc('unblock_contributor', { target: contributorId });
  if (error) throw new Error(`The phone was not unblocked: ${error.message}`);
}
