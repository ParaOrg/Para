import { useQuery } from '@tanstack/react-query';

import { fetchAccount, storedAccount } from './account';
import { accountKeys } from './account-keys';
import { canUpload } from './contribute-client';

/**
 * Who is signed in to an account on this phone: null for no account, an anonymous phone included.
 * Until Supabase answers, the session the phone stored stands in, so the page never waits on the
 * network to show Start. The session changes only through the sign-in, sign-up and sign-out
 * mutations, which write their answer here, so nothing refetches on focus.
 */
export function useAccountQuery() {
  return useQuery({
    queryKey: accountKeys.session(),
    queryFn: fetchAccount,
    enabled: canUpload(),
    placeholderData: () => storedAccount(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // Reads the stored session first; with no signal it must still answer, not pause.
    networkMode: 'always',
  });
}
