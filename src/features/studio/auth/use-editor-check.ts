import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { editorStatusOf, type EditorVerdict } from './editor-status';
import { fetchIsEditor, signOutOfStudio } from '../data/editor-check';

/**
 * Asks, once per account, whether the signed-in account is an editor: after a
 * sign-in and for a session restored on load. One that is not is signed out of
 * the studio at once, and `isTurnedAway` stays set until the notice is closed.
 *
 * An effect, not a query: the answer decides an auth action (the sign-out),
 * and it is asked above the studio's query client, which is per editor.
 */
export function useEditorCheck(session: Session | null | undefined) {
  const userId = session?.user.id ?? null;
  const [verdict, setVerdict] = useState<EditorVerdict | null>(null);
  const [isTurnedAway, setIsTurnedAway] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let isCurrent = true;
    void fetchIsEditor().then((isEditor) => {
      if (!isCurrent) return;
      setVerdict({ userId, isEditor });
      if (isEditor) return;
      setIsTurnedAway(true);
      void signOutOfStudio();
    });
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  return {
    status: editorStatusOf(userId, verdict),
    isTurnedAway,
    dismiss: () => setIsTurnedAway(false),
  };
}
