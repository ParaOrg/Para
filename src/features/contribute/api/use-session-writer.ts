import { useQueryClient } from '@tanstack/react-query';

import type { Account } from './account';
import { accountKeys } from './account-keys';

/** Stores a sign-in, sign-up or sign-out's answer where the session query reads it. */
export function useSessionWriter(): (account: Account | null) => void {
  const queryClient = useQueryClient();
  return (account) => queryClient.setQueryData(accountKeys.session(), account);
}
