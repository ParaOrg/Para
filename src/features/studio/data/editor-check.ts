import type { SupabaseClient } from '@supabase/supabase-js';
import * as z from 'zod/mini';

import { getSupabase, requireSupabase } from './supabase';

export interface EditorAnswer {
  isEditor: boolean;
  /** Why the answer is a guess, for the console; null when the database said. */
  warning: string | null;
}

/**
 * What `am_i_editor` said. When it cannot tell (the function not applied yet,
 * a network failure, an answer that is not a yes or no), the account is let
 * in, as before the check: turning editors away when unsure would lock the
 * owner out, and row security still refuses a non-editor's writes.
 */
export function readEditorAnswer(data: unknown, error: { message: string } | null): EditorAnswer {
  if (error) {
    return {
      isEditor: true,
      warning: `Could not ask whether this account is an editor, so it is let in: ${error.message}`,
    };
  }
  const parsed = z.safeParse(z.boolean(), data);
  if (!parsed.success) {
    return {
      isEditor: true,
      warning: 'am_i_editor gave no yes or no, so this account is let in.',
    };
  }
  return { isEditor: parsed.data, warning: null };
}

// am_i_editor is not in the generated types until its migration is applied.
const untyped = (): SupabaseClient => requireSupabase();

/** Whether the signed-in account is on the editor list (`am_i_editor`, 20261030090000). */
export async function fetchIsEditor(): Promise<boolean> {
  let answer: EditorAnswer;
  try {
    const { data, error } = await untyped().rpc('am_i_editor');
    answer = readEditorAnswer(data, error);
  } catch (err) {
    answer = readEditorAnswer(null, {
      message: err instanceof Error ? err.message : 'the request failed',
    });
  }
  if (answer.warning) console.warn(answer.warning);
  return answer.isEditor;
}

/**
 * Signs the account out of the studio on this device only: the contributor
 * page keeps its own session under its own storage key, and other devices
 * keep theirs.
 */
export async function signOutOfStudio(): Promise<void> {
  const { error } = (await getSupabase()?.auth.signOut({ scope: 'local' })) ?? { error: null };
  if (error) console.warn(`Signing out of the studio failed: ${error.message}`);
}
