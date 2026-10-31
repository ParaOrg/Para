import { useQuery } from '@tanstack/react-query';

import { accountKeys } from './account-keys';
import { fetchMyStats } from './fetch-my-stats';

/**
 * The signed-in contributor's lifetime stats. A saved, removed or claimed ride changes them, so
 * they are asked again each time they are shown.
 * TODO: mounted nowhere yet; the Account page will show them once it is designed.
 */
export function useMyStatsQuery() {
  return useQuery({
    queryKey: accountKeys.stats(),
    queryFn: fetchMyStats,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    networkMode: 'always',
  });
}
