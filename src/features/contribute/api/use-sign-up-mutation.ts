import { useMutation } from '@tanstack/react-query';

import { storedAccount } from './account';
import { signUp } from './sign-up';
import { useSessionWriter } from './use-session-writer';

/**
 * Makes the account. Its answer is not written to the session on success: the page shows Thank
 * you first, and writes it on Continue (useSessionWriter), which lets the page through.
 */
export function useSignUpMutation() {
  const write = useSessionWriter();
  return useMutation({
    mutationFn: signUp,
    // The account may exist even though the request failed (only the profile did): then the
    // page moves on to finishing it, with the email already set.
    onError: () => {
      const stored = storedAccount();
      if (stored) write({ ...stored, hasProfile: false });
    },
    // Without this, TanStack pauses a mutation while the browser is offline, and the
    // button stays on "Creating account…".
    networkMode: 'always',
  });
}
