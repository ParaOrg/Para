import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { getSupabase } from '../data/supabase';

/** `undefined` while the initial session is still being restored. */
export function useSession(): Session | null | undefined {
  // No Supabase configured: nothing to restore, so plainly signed out.
  const [session, setSession] = useState<Session | null | undefined>(() =>
    getSupabase() ? undefined : null,
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  return session;
}
