import type { DraftRow } from './review-schema';

/**
 * One draft per route or hotspot, and only the editor who made it changes it
 * (spec, "Draft → Pending → Approved"); the database lets any editor, so the
 * studio holds the rule. Another editor can look.
 */

/** What an editor with no name on file is called. A user id or email is never shown. */
export const OTHER_EDITOR = 'another editor';

/** What the studio knows about a subject whose draft is not the signed-in editor's. */
export type DraftLock =
  { state: 'checking' } | { state: 'unknown' } | { state: 'other'; name: string | null };

/** The notice's words, by what is known. */
export function lockMessage(lock: DraftLock): string {
  switch (lock.state) {
    case 'checking':
      return 'Checking whether another editor is changing this…';
    case 'unknown':
      return 'Could not check whether another editor is changing this.';
    case 'other':
      return `Being changed by ${lock.name ?? OTHER_EDITOR}. You can look at it, but not change it.`;
  }
}

/** Why a save was refused, in the editor's words. */
export function lockRefusal(name: string | null): string {
  return `Nothing was saved. This is being changed by ${name ?? OTHER_EDITOR}. You can look at it, but not change it.`;
}

/** Whether the draft belongs to an editor other than `userId`. A draft whose maker is gone belongs to nobody. */
export function isAnothersDraft(draft: DraftRow | null, userId: string): draft is DraftRow {
  return draft !== null && draft.editor_id !== null && draft.editor_id !== userId;
}

/** The maker's name, or null when the owner has not filled one in. */
export function editorNameOf(
  names: ReadonlyMap<string, string>,
  editorId: string | null,
): string | null {
  if (editorId === null) return null;
  const name = names.get(editorId);
  return name === undefined || name === '' ? null : name;
}
