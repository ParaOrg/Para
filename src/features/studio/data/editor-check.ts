import * as z from 'zod/mini';

import { getSupabase, requireSupabase } from './supabase';

/** What went wrong when asking, as supabase-js reports it: a PostgREST or Postgres code, an HTTP status. */
export interface EditorAskError {
  message: string;
  code?: string;
  /** 0 when no response came back. */
  status?: number;
}

export interface EditorAnswer {
  isEditor: boolean;
  /** Why the answer is not the database's own, for the console; null when it is. */
  problem: { level: 'warn' | 'error'; message: string } | null;
}

/** A refusal: the request was turned away (a bad or expired token, no right to ask). */
const isRefusal = (error: EditorAskError): boolean =>
  error.status === 401 || error.status === 403 || error.code === '42501';
/** The function is not there yet: the migration is not applied. */
const isMissing = (error: EditorAskError): boolean =>
  error.code === 'PGRST202' || error.status === 404;
/** No answer at all: offline, a flaky connection, or the server failing. */
const isUnreachable = (error: EditorAskError): boolean =>
  error.status === undefined || error.status === 0 || error.status >= 500;

/**
 * What `am_i_editor` said. The account is let in without a yes only when the
 * studio cannot ask: the function is missing (PGRST202 or 404, the migration
 * not applied yet: turning everyone away would lock the owner out), or no
 * response came back (network failure, a 5xx, the request threw: an editor
 * offline must not be turned away; row security still refuses a non-editor's
 * writes). A refusal (401, 403, 42501), any other error, or an answer that is
 * not a yes or no counts as not an editor.
 */
export function readEditorAnswer(data: unknown, error: EditorAskError | null): EditorAnswer {
  if (error) {
    if (!isRefusal(error) && isMissing(error)) {
      return {
        isEditor: true,
        problem: {
          level: 'warn',
          message: `am_i_editor is not in the database yet, so this account is let in: ${error.message}`,
        },
      };
    }
    if (!isRefusal(error) && isUnreachable(error)) {
      return {
        isEditor: true,
        problem: {
          level: 'warn',
          message: `Could not reach the database to ask whether this account is an editor, so it is let in: ${error.message}`,
        },
      };
    }
    return {
      isEditor: false,
      problem: {
        level: 'error',
        message: `Asking whether this account is an editor was refused, so it is not let in: ${error.message}`,
      },
    };
  }
  const parsed = z.safeParse(z.boolean(), data);
  if (!parsed.success) {
    return {
      isEditor: false,
      problem: {
        level: 'error',
        message: 'am_i_editor gave no yes or no, so this account is not let in.',
      },
    };
  }
  return { isEditor: parsed.data, problem: null };
}

/** Whether the signed-in account is on the editor list (`am_i_editor`, 20261030090000). */
export async function fetchIsEditor(): Promise<boolean> {
  let answer: EditorAnswer;
  try {
    const { data, error, status } = await requireSupabase().rpc('am_i_editor');
    answer = readEditorAnswer(
      data,
      error ? { message: error.message, code: error.code, status } : null,
    );
  } catch (err) {
    // The request threw before any response: as unreachable.
    answer = readEditorAnswer(null, {
      message: err instanceof Error ? err.message : 'the request failed',
      status: 0,
    });
  }
  if (answer.problem?.level === 'warn') console.warn(answer.problem.message);
  if (answer.problem?.level === 'error') console.error(answer.problem.message);
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
