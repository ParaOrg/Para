import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** How long a load's skeleton may stand with no data before the page says it failed. */
export const LOAD_GIVE_UP_MS = 8_000;

export interface LoadGiveUp {
  /** The load has lasted LOAD_GIVE_UP_MS with nothing come: show its error, with Try again. */
  hasGivenUp: boolean;
  /** Try again: the wait starts afresh, whether or not the load itself was still under way. */
  restart: () => void;
}

/**
 * Gives a load up after LOAD_GIVE_UP_MS, so a skeleton never stands for good on a signal that
 * carries nothing. Data arriving late still shows: the load is then no longer loading.
 */
export function useLoadGiveUp(isLoading: boolean): LoadGiveUp {
  const [attempt, setAttempt] = useState(0);
  const [givenUpOn, setGivenUpOn] = useState<number | null>(null);
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setGivenUpOn(attempt), LOAD_GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [isLoading, attempt]);
  return {
    hasGivenUp: isLoading && givenUpOn === attempt,
    restart: () => setAttempt((n) => n + 1),
  };
}

/**
 * Try again on a load: the fetch still under way is called off first, then asked afresh. TanStack's
 * refetch alone hands back a fetch already running while the query has no data yet, so a load that
 * never answers would never be asked again.
 */
export async function askAgain(
  queryClient: QueryClient,
  queryKey: QueryKey,
  refetch: () => Promise<unknown>,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  await refetch();
}
