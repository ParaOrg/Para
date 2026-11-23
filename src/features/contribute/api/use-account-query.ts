import { useQuery, type Query } from '@tanstack/react-query';

import { fetchAccount, storedAccount, type Account } from './account';
import { accountKeys } from './account-keys';
import { canUpload } from './contribute-config';

/**
 * Who is signed in to an account on this phone: null for no account, an anonymous phone included.
 * Until Supabase answers, the session the phone stored stands in, so the page never waits on the
 * network to show Start; nothing is sent on it until the check has an answer (isAccountConfirmed).
 * That answer may be the stored session itself, when Supabase does not answer within the check's
 * 8 s (account.ts): sends may start then, and are safe, as a send never signs in anonymously and a
 * session found gone stops it (use-uploads.ts). The sign-in, sign-up and sign-out mutations write
 * their answer here. Supabase is asked again as the phone comes back online or to the front, so a
 * session ended elsewhere is seen then; not while no account is signed in with its name, so a
 * sign-in or sign-up under way is never moved on by it.
 */
export function useAccountQuery() {
  return useQuery({
    queryKey: accountKeys.session(),
    queryFn: ({ signal }) => fetchAccount(signal),
    enabled: canUpload(),
    placeholderData: () => storedAccount(),
    staleTime: Infinity,
    refetchOnWindowFocus: whileSignedIn,
    refetchOnReconnect: whileSignedIn,
    // Reads the stored session first; with no signal it must still answer, not pause.
    networkMode: 'always',
  });
}

/** Asked again only while an account with its name is signed in: never mid sign-in or sign-up. */
const whileSignedIn = (query: Query<Account | null>): 'always' | false =>
  query.state.data?.hasProfile ? 'always' : false;

/** Whether the session check has its answer, rather than the stored session standing in. */
export function isAccountConfirmed(query: { isPlaceholderData: boolean }): boolean {
  return !canUpload() || !query.isPlaceholderData;
}
