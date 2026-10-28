import { useState } from 'react';

import {
  SignIn,
  StudioSessionProvider,
  skipSignInForTests,
  usePasswordRecovery,
  useSession,
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
 * The room is `Workshop`, beside this file (workshop.tsx); the door is all
 * this file holds.
 */
export function StudioApp() {
  const session = useSession();
  // Read on the very first render, before supabase-js consumes the reset link.
  const recovery = usePasswordRecovery();
  const [admitted, setAdmitted] = useState(false);
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
        <SignIn
          title="Sign in to Para Studio"
          notice={recovery.error ? `Reset link problem: ${recovery.error}` : null}
        />
      </div>
    );
  }

  return (
    <StudioSessionProvider session={session}>
      <Workshop session={session ?? null} recovery={recovery} />
    </StudioSessionProvider>
  );
}
