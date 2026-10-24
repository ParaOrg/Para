import { useQuery } from '@tanstack/react-query';

import { fetchAccount } from './account';
import { accountKeys } from './account-keys';
import { canUpload } from './contribute-client';

/**
 * Who is signed in to an account on this phone: null for no account, an anonymous phone included.
 * The session changes only through the sign-in, sign-up and sign-out mutations, which write their
 * answer here, so nothing refetches on focus.
 */
export function useAccountQuery() {
  return useQuery({
    queryKey: accountKeys.session(),
    queryFn: fetchAccount,
    enabled: canUpload(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
