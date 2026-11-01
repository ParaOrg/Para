import type { QueryClient } from '@tanstack/react-query';

import { storedAccount, type Account } from './account';
import { accountKeys } from './account-keys';
import { forgetAccountData } from './use-session-writer';

/**
 * Drops what is kept for one account the moment the session names another, however it came to
 * (a check as the phone comes back online or to the front finding another account, or none), not
 * only through the sign-in and sign-out mutations (useSessionWriter). Returns what stops it.
 */
export function forgetOtherAccounts(queryClient: QueryClient): () => void {
  // Until Supabase answers, the session the phone stored stands in (useAccountQuery).
  const sessionNow = () =>
    queryClient.getQueryData<Account | null>(accountKeys.session()) ?? storedAccount();
  let lastId = sessionNow()?.id ?? null;
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    const [scope, kind] = event.query.queryKey;
    if (scope !== accountKeys.all[0] || kind !== 'session') return;
    const id = sessionNow()?.id ?? null;
    if (id !== lastId) forgetAccountData(queryClient);
    lastId = id;
  });
}
