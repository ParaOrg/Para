import { useMutation } from '@tanstack/react-query';

import { requestPasswordCode } from './account';

export function useRequestPasswordCodeMutation() {
  // Without networkMode, TanStack pauses a mutation while the browser is offline.
  return useMutation({ mutationFn: requestPasswordCode, networkMode: 'always' });
}
