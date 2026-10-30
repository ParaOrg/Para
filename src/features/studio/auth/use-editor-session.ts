import { editorSessionOf } from './editor-status';
import { useEditorCheck } from './use-editor-check';
import { useSession } from './use-session';

/**
 * The studio's session, an editor's only: the restored or signed-in session
 * once the account is known to be on the editor list, undefined while that is
 * asked, null otherwise. `isTurnedAway` is set when an account that is not an
 * editor signed in (it is signed out of the studio), until `dismiss`.
 */
export function useEditorSession() {
  const session = useSession();
  const check = useEditorCheck(session);
  return {
    session: editorSessionOf(session, check.status),
    isTurnedAway: check.isTurnedAway,
    dismiss: check.dismiss,
  };
}
