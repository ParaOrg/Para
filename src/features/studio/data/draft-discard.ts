import { isAnothersDraft } from './draft-lock';
import type { DraftRow } from './review-schema';

/**
 * How long another editor's draft must go without a change before any editor may discard it.
 * discard_draft's interval (supabase/migrations/20261128090000_discard_stale_draft.sql) must be
 * the same number: this one decides what the studio offers, that one decides what is allowed.
 */
export const OTHER_EDITOR_DISCARD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When another editor's draft may be discarded: 7 days after its last change, the later of the
 * server's two stamps (a draft made by unpublishing carries the row's old updated_at, but is new).
 */
export function discardableFrom(stamps: Pick<DraftRow, 'updated_at' | 'created_at'>): Date {
  const lastChange = Math.max(
    new Date(stamps.updated_at).getTime(),
    new Date(stamps.created_at).getTime(),
  );
  return new Date(lastChange + OTHER_EDITOR_DISCARD_DAYS * DAY_MS);
}

/** What the studio offers on a draft that is another editor's. */
export type OtherDiscard = { state: 'wait'; from: Date | null } | { state: 'ready' };

/**
 * Whether `draft` may be discarded by `userId` as another editor's draft, as of `now`: null when
 * it is their own or nobody's (the usual Discard applies), otherwise whether the 7 days are up.
 * A stamp that cannot be read waits, which the database would say too.
 */
export function otherDiscardOf(draft: DraftRow, userId: string, now: Date): OtherDiscard | null {
  if (!isAnothersDraft(draft, userId)) return null;
  const from = discardableFrom(draft);
  if (Number.isNaN(from.getTime())) return { state: 'wait', from: null };
  return now.getTime() >= from.getTime() ? { state: 'ready' } : { state: 'wait', from };
}

/** The line shown instead of Discard while the 7 days run: "You can discard this from 5 Dec if it isn't changed." */
export function discardWaitMessage(from: Date | null, timeZone?: string): string {
  if (from === null) {
    return `You can discard this once it has gone ${OTHER_EDITOR_DISCARD_DAYS} days without a change.`;
  }
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(
    from,
  );
  return `You can discard this from ${day} if it isn't changed.`;
}
