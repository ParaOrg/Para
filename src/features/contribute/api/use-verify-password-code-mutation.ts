import { useMutation } from '@tanstack/react-query';

import { verifyPasswordCode } from './password-reset';

/**
 * Checks the emailed code, which signs the phone in. Its answer is not written to the session:
 * the page stays on the reset until the new password is saved, then writes it (useSessionWriter).
 */
export function useVerifyPasswordCodeMutation() {
  return useMutation({ mutationFn: verifyPasswordCode, networkMode: 'always' });
}
