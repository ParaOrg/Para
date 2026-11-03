import { useMutation } from '@tanstack/react-query';

import { signOut } from './account';
import { useSessionWriter } from './use-session-writer';

/** Signs this phone out; nothing kept for the account stays to show the next one (useSessionWriter). */
export function useSignOutMutation() {
  const write = useSessionWriter();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => write(null),
    networkMode: 'always',
  });
}
