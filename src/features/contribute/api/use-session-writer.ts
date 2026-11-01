import { useQueryClient } from '@tanstack/react-query';

import { rememberProfile, type Account } from './account';
import { accountKeys } from './account-keys';

/**
 * Stores a sign-in, sign-up or sign-out's answer where the session query reads it. When the
 * account changes (signed out, or another account signed in) everything kept for the last one
 * goes first: its profile, uploads and stats must never show for the next, on a shared phone.
 */
export function useSessionWriter(): (account: Account | null) => Promise<void> {
  const queryClient = useQueryClient();
  return async (account) => {
    // A check of the last session still on its way (the page opening, the phone back online)
    // must not land over this answer: it is called off, and what it found is dropped.
    await queryClient.cancelQueries({ queryKey: accountKeys.session() });
    const last = queryClient.getQueryData<Account | null>(accountKeys.session());
    if (last?.id !== account?.id) {
      queryClient.removeQueries({
        queryKey: accountKeys.all,
        predicate: (query) => query.queryKey[1] !== 'session',
      });
    }
    queryClient.setQueryData(accountKeys.session(), account);
    rememberProfile(account);
  };
}
