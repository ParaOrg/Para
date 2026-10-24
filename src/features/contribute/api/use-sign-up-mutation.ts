import { useMutation } from '@tanstack/react-query';

import { signUp } from './account';
import { useSessionWriter } from './use-session-writer';

export function useSignUpMutation() {
  const write = useSessionWriter();
  return useMutation({ mutationFn: signUp, onSuccess: write });
}
