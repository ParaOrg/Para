import type { Session } from '@supabase/supabase-js';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/shared/lib/query-client';

import { StudioSessionContext } from './use-studio-session';

interface StudioSessionProviderProps {
  session: Session | null | undefined;
  children: ReactNode;
}

/**
 * The studio's one query client and its session, for everything under the
 * studio: the cards, Drafts, Contributors and the Public map share one cache,
 * so what one changes, the others see. Emptied when the account changes, so
 * nothing read for one editor is shown to the next, or to no one.
 */
export function StudioSessionProvider({ session, children }: StudioSessionProviderProps) {
  const [client] = useState(createQueryClient);
  const userId = session?.user.id ?? null;
  const [cachedFor, setCachedFor] = useState(userId);
  // During render, as React adjusts state to a prop: before anything below
  // renders and reads the cache for the new account. Clearing is idempotent,
  // so a render React repeats or throws away costs only a read again.
  if (cachedFor !== userId) {
    setCachedFor(userId);
    client.clear();
  }
  return (
    <QueryClientProvider client={client}>
      <StudioSessionContext value={session}>{children}</StudioSessionContext>
    </QueryClientProvider>
  );
}
