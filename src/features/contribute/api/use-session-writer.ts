import { useQueryClient } from '@tanstack/react-query';

import type { Account } from './account';
import { accountKeys } from './account-keys';

/**
 * Stores a sign-in, sign-up or sign-out's answer where the session query reads it. When the
 * account changes (signed out, or another account signed in) everything kept for the last one
 * goes first: its profile, uploads and stats must never show for the next, on a shared phone.
 */
export function useSessionWriter(): (account: Account | null) => void {
  const queryClient = useQueryClient();
  return (account) => {
    const last = queryClient.getQueryData<Account | null>(accountKeys.session());
    if (last?.id !== account?.id) {
      queryClient.removeQueries({
        queryKey: accountKeys.all,
        predicate: (query) => query.queryKey[1] !== 'session',
      });
    }
    queryClient.setQueryData(accountKeys.session(), account);
  };
}
