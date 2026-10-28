import { useMutation } from '@tanstack/react-query';

import { signIn } from './sign-in';
import { useSessionWriter } from './use-session-writer';

export function useSignInMutation() {
  const write = useSessionWriter();
  return useMutation({ mutationFn: signIn, onSuccess: write, networkMode: 'always' });
}
