import { useQuery } from '@tanstack/react-query';

import { accountKeys } from './account-keys';
import { fetchProfile } from './fetch-profile';
import { slowloaded } from '../common/slowload-switch';

/** The signed-in account's name and number; only the update and sign-out mutations change them. */
export function useProfileQuery() {
  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: () => slowloaded(fetchProfile),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    networkMode: 'always',
  });
}
