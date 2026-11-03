import * as z from 'zod/mini';

import type { Recording } from '../storage/recording-schema';

/** Its own key: the deletion this phone began, kept until the phone has forgotten the account. */
export const DELETION_KEY = 'para.contributor-deletion';

// A deletion kept by an earlier version also holds the uploads Para had then: read past, unused.
const deletionSchema = z.object({ accountId: z.string() });

/** An account deletion this phone asked for. */
export type AccountDeletion = z.infer<typeof deletionSchema>;

/** The deletion this phone began and has not finished, or null; unreadable storage is none. */
export function readDeletion(): AccountDeletion | null {
  try {
    const raw = localStorage.getItem(DELETION_KEY);
    if (raw === null) return null;
    const parsed = deletionSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    console.warn('The phone kept an account deletion it cannot read; dropping it.');
    localStorage.removeItem(DELETION_KEY);
  } catch (error) {
    console.warn('The phone could not read its account deletion.', error);
  }
  return null;
}

/** Keeps the deletion until the phone has forgotten the account; a refusal means no retry after a reload. */
export function keepDeletion(deletion: AccountDeletion): void {
  try {
    localStorage.setItem(DELETION_KEY, JSON.stringify(deletion));
  } catch (error) {
    console.warn('The phone could not keep its account deletion.', error);
  }
}

export function dropDeletion(): void {
  try {
    localStorage.removeItem(DELETION_KEY);
  } catch (error) {
    console.warn('The phone could not drop its finished account deletion.', error);
  }
}

/**
 * What Delete account does next, from who is signed in and the deletion kept from an earlier try:
 * - `ask`: ask Para to delete `accountId` (again, when an earlier try for it lost its answer);
 * - `forget`: Para already deleted it (the answer was lost, and the session is gone since): only
 *   the phone is left to clear;
 * - `none`: nobody is signed in and nothing was begun.
 */
export type DeletionStep =
  | { kind: 'ask'; accountId: string; kept: AccountDeletion | null }
  | { kind: 'forget'; deletion: AccountDeletion }
  | { kind: 'none' };

export function nextDeletionStep(
  signedInId: string | null,
  kept: AccountDeletion | null,
): DeletionStep {
  if (signedInId === null) return kept ? { kind: 'forget', deletion: kept } : { kind: 'none' };
  return { kind: 'ask', accountId: signedInId, kept: kept?.accountId === signedInId ? kept : null };
}

/**
 * The recordings this phone forgets with a deleted account: every saved one, sent or not, whoever
 * sent it, so nothing of the account is left on the phone to show. Only saved recordings: one
 * still recording, paused or on its form is the ride in hand, never deleted.
 */
export function recordingsToForget(recordings: readonly Recording[]): Recording[] {
  return recordings.filter((recording) => recording.status === 'saved');
}
