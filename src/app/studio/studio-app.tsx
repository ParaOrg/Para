import { useState } from 'react';

import {
  NotEditor,
  SignIn,
  StudioSessionProvider,
  skipSignInForTests,
  useEditorSession,
  usePasswordRecovery,
} from '@/features/studio';

import { Workshop } from './workshop';

/**
 * The editor at /studio/. Signed out, the page is only its front door: the
 * map, the drawing tools and everything that writes appear once an editor
 * signs in. A drawing in progress survives on this device either way.
 *
 * The door guards the way in, not the room. If the session ends later —
 * signed out in another tab, a refresh that stops working — the workshop
 * stays on screen with whatever is half-typed, and the next save asks for
 * sign-in again. Swapping it for the door would throw that work away.
 *
 * Only an editor's account comes through (useEditorSession). Any other, such
 * as a contributor's, is signed out of the studio as soon as it is known, and
 * told so over the door, or over the workshop when it signed in from there.
 *
 * The room is `Workshop`, beside this file (workshop.tsx); the door is all
 * this file holds.
 */
export function StudioApp() {
  const { session, isTurnedAway, dismiss } = useEditorSession();
  // Read on the very first render, before supabase-js consumes the reset link.
  const recovery = usePasswordRecovery();
  const [admitted, setAdmitted] = useState(false);
  const notice = isTurnedAway ? <NotEditor onSignInAgain={dismiss} /> : null;
  // Once through the door, the editor stays admitted: set during render, the
  // way React adjusts state to a prop, so no frame shows the door after it.
  if (session && !admitted) setAdmitted(true);

  // Still restoring a saved session: show nothing rather than flash the door.
  if (session === undefined && !admitted) {
    return (
      <div className="grid h-full place-items-center bg-neutral-100">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (!session && !admitted && !skipSignInForTests()) {
    return (
      <div className="relative h-full w-full bg-neutral-100">
        {notice ?? (
          <SignIn
            title="Sign in to Para Studio"
            notice={recovery.error ? `Reset link problem: ${recovery.error}` : null}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <StudioSessionProvider session={session}>
        <Workshop session={session ?? null} recovery={recovery} />
      </StudioSessionProvider>
      {notice}
    </>
  );
}
