import { useMutation } from '@tanstack/react-query';

import { signIn } from './account';
import { useSessionWriter } from './use-session-writer';

export function useSignInMutation() {
  const write = useSessionWriter();
  return useMutation({ mutationFn: signIn, onSuccess: write });
}
