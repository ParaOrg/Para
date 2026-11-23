import { useQuery } from '@tanstack/react-query';

import { accountKeys } from './account-keys';
import { fetchMyUses } from './fetch-my-uses';

/** What the signed-in contributor's rides became on the map, asked each time History opens. */
export function useMyUsesQuery() {
  return useQuery({
    queryKey: accountKeys.uses(),
    queryFn: fetchMyUses,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
