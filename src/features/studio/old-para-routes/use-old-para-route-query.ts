import { useQuery } from '@tanstack/react-query';

import { fetchOldParaRoute } from './fetch-old-para-routes';
import { oldParaRouteKeys } from './old-para-route-keys';

/** One old Para route's file, read when the editor picks a route with a line. */
export function useOldParaRouteQuery(paraId: string) {
  return useQuery({
    queryKey: oldParaRouteKeys.route(paraId),
    queryFn: () => fetchOldParaRoute(paraId),
    staleTime: Infinity,
  });
}
