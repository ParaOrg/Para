import { useQuery } from '@tanstack/react-query';

import { accountKeys } from './account-keys';
import { fetchAccountUploads } from './account-uploads';
import { canUpload } from './contribute-client';
import { slowloaded } from '../common/slowload-switch';

/** The account's uploads from the database, asked again each time History opens. */
export function useAccountUploadsQuery() {
  return useQuery({
    queryKey: accountKeys.uploads(),
    queryFn: () => slowloaded(fetchAccountUploads),
    enabled: canUpload(),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    // With no signal it must fail at once and say so, not wait for one.
    networkMode: 'always',
  });
}
