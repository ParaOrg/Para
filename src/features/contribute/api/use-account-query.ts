import { useQuery } from '@tanstack/react-query';

import { fetchAccount, storedAccount } from './account';
import { accountKeys } from './account-keys';
import { canUpload } from './contribute-client';

/**
 * Who is signed in to an account on this phone: null for no account, an anonymous phone included.
 * Until Supabase answers, the session the phone stored stands in, so the page never waits on the
 * network to show Start; nothing is sent on it until Supabase has said (isAccountConfirmed). The
 * sign-in, sign-up and sign-out mutations write their answer here. Supabase is asked again as the
 * phone comes back online or to the front, so a session ended elsewhere (the account deleted, or
 * signed out on another phone) is seen then, not only at the next opening.
 */
export function useAccountQuery() {
  return useQuery({
    queryKey: accountKeys.session(),
    queryFn: ({ signal }) => fetchAccount(signal),
    enabled: canUpload(),
    placeholderData: () => storedAccount(),
    staleTime: Infinity,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    // Reads the stored session first; with no signal it must still answer, not pause.
    networkMode: 'always',
  });
}

/** Whether Supabase has said who is signed in, rather than the stored session standing in. */
export function isAccountConfirmed(query: { isPlaceholderData: boolean }): boolean {
  return !canUpload() || !query.isPlaceholderData;
}
