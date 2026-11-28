import { useQuery } from '@tanstack/react-query';

import { fetchOldParaRouteIndex } from './fetch-old-para-routes';
import { oldParaRouteKeys } from './old-para-route-keys';

/** The index of old Para routes, read the first time the picker opens and kept: it never changes. */
export function useOldParaRouteIndexQuery() {
  return useQuery({
    queryKey: oldParaRouteKeys.index(),
    queryFn: fetchOldParaRouteIndex,
    staleTime: Infinity,
  });
}
