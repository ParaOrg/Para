import { canUpload } from '../api/contribute-client';
import { useAccountQuery } from '../api/use-account-query';

/**
 * Whether the page may show Ready and the rest. A build with no database has no accounts, so
 * recordings stay on the phone as they always did; otherwise the page waits for an account.
 */
export type AccountGate = 'loading' | 'needs-account' | 'ready';

export function useAccountGate(): AccountGate {
  const account = useAccountQuery();
  if (!canUpload()) return 'ready';
  if (account.isPending) return 'loading';
  return account.data ? 'ready' : 'needs-account';
}
