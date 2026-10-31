import { useMutation, useQueryClient } from '@tanstack/react-query';

import { accountKeys } from './account-keys';
import { deleteAccount } from './delete-account';
import { useSessionWriter } from './use-session-writer';

/**
 * Deletes the signed-in account, in Para and on this phone; nothing of it stays to show.
 * TODO: mounted nowhere yet; Account settings → Delete account will, after its confirm.
 */
export function useDeleteAccountMutation() {
  const write = useSessionWriter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: accountKeys.all });
      write(null);
    },
    networkMode: 'always',
  });
}
