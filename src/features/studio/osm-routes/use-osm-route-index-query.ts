import { useQuery } from '@tanstack/react-query';

import { fetchOsmRouteIndex } from './fetch-osm-routes';
import { osmRouteKeys } from './osm-route-keys';

/**
 * The index of OSM routes, read the first time the picker opens and kept for the visit: the files
 * change monthly. `isEnabled` false reads nothing.
 */
export function useOsmRouteIndexQuery({ isEnabled }: { isEnabled: boolean }) {
  return useQuery({
    queryKey: osmRouteKeys.index(),
    queryFn: fetchOsmRouteIndex,
    enabled: isEnabled,
    staleTime: Infinity,
  });
}
