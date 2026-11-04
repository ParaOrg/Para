import { useMutation } from '@tanstack/react-query';

import { accountKeys } from './account-keys';
import { deleteAccount } from './delete-account';
import { useSessionWriter } from './use-session-writer';

/**
 * Deletes the signed-in account, in Para and on this phone, its uploads too if asked; nothing of
 * it stays to show: the session writer drops everything kept for it as the session goes. Delete
 * account calls it, after its question.
 */
export function useDeleteAccountMutation() {
  const write = useSessionWriter();
  return useMutation({
    mutationKey: accountKeys.deleteAccount(),
    mutationFn: deleteAccount,
    onSuccess: () => write(null),
    networkMode: 'always',
  });
}
