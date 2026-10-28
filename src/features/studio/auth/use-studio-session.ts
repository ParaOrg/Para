import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

/**
 * The studio's session, read once (useSession, in StudioApp) and handed down
 * by StudioSessionProvider. Outside one, as in a story, plainly signed out.
 */
export const StudioSessionContext = createContext<Session | null | undefined>(null);

/** The editor's session: `undefined` while it is still being restored, null when signed out. */
export function useStudioSession(): Session | null | undefined {
  return useContext(StudioSessionContext);
}
