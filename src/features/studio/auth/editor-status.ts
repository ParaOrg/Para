/** Where the signed-in account stands: no one signed in, being asked about, or answered. */
export type EditorStatus = 'signed-out' | 'checking' | 'editor' | 'not-editor';

/** The answer for one account. */
export interface EditorVerdict {
  userId: string;
  isEditor: boolean;
}

/** The status of the account signed in now; an answer about another account counts for nothing. */
export function editorStatusOf(userId: string | null, verdict: EditorVerdict | null): EditorStatus {
  if (!userId) return 'signed-out';
  if (verdict?.userId !== userId) return 'checking';
  return verdict.isEditor ? 'editor' : 'not-editor';
}

/**
 * The session the studio may use: the account's while it is an editor's,
 * undefined while that is still being asked (or the session restored), and
 * null otherwise. A contributor's account never reaches the workshop.
 */
export function editorSessionOf<TSession>(
  session: TSession | null | undefined,
  status: EditorStatus,
): TSession | null | undefined {
  if (session === undefined || status === 'checking') return undefined;
  return status === 'editor' ? session : null;
}
