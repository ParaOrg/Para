import { useMutation } from '@tanstack/react-query';

import { setNewPassword } from './password-reset';

export function useSetNewPasswordMutation() {
  return useMutation({ mutationFn: setNewPassword, networkMode: 'always' });
}
