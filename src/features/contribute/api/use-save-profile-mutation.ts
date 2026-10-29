import { useMutation } from '@tanstack/react-query';

import { saveProfile } from './sign-up';
import { useSessionWriter } from './use-session-writer';

export function useSaveProfileMutation() {
  const write = useSessionWriter();
  return useMutation({ mutationFn: saveProfile, onSuccess: write, networkMode: 'always' });
}
