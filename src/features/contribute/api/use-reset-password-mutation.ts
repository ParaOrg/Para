import { useMutation } from '@tanstack/react-query';

import { resetPassword } from './account';
import { useSessionWriter } from './use-session-writer';

export function useResetPasswordMutation() {
  const write = useSessionWriter();
  return useMutation({ mutationFn: resetPassword, onSuccess: write, networkMode: 'always' });
}
