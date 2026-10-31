import { useMutation } from '@tanstack/react-query';

import { changePassword } from './change-password';

/** A password change from Account settings, the current password checked first. */
export function useChangePasswordMutation() {
  return useMutation({ mutationFn: changePassword, networkMode: 'always' });
}
