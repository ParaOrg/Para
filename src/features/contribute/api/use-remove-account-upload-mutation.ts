import { useMutation, useQueryClient } from '@tanstack/react-query';

import { accountKeys } from './account-keys';
import type { AccountUpload } from './account-uploads';
import { removeUpload } from './upload-contribution';

/** Removes one of the account's uploads from Para, for one that no phone here holds. */
export function useRemoveAccountUploadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeUpload,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<AccountUpload[]>(accountKeys.uploads(), (uploads) =>
        uploads?.filter((upload) => upload.id !== id),
      );
      // The removed ride no longer counts.
      void queryClient.invalidateQueries({ queryKey: accountKeys.stats() });
    },
    networkMode: 'always',
  });
}
