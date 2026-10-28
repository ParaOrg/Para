import { isAnothersDraft, editorNameOf, lockRefusal } from './draft-lock';
import { fetchEditorNames } from './editor-names';
import type { DraftRow } from './review-schema';
import { requireSupabase } from './supabase';

/**
 * Throws when `draft` is another editor's, with the maker's name if the owner
 * has filled it in: a save built on it would replace their work. The cards
 * already keep Edit away from it; this is for a card opened before the other
 * editor started.
 */
export async function assertNotAnothersDraft(draft: DraftRow | null): Promise<void> {
  // A draft whose maker is gone belongs to nobody.
  if (!draft || draft.editor_id === null) return;
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw new Error(error.message);
  const userId = data.session?.user.id;
  if (!userId || !isAnothersDraft(draft, userId)) return;
  // A name that cannot be read must not turn the refusal into a second error.
  const names = await fetchEditorNames().catch(() => new Map<string, string>());
  throw new Error(lockRefusal(editorNameOf(names, draft.editor_id)));
}
