import { useQuery } from '@tanstack/react-query';

import { fetchOsmRoute } from './fetch-osm-routes';
import { osmRouteKeys } from './osm-route-keys';

/** One OSM route's file, read when the editor picks it; null reads nothing. */
export function useOsmRouteQuery(id: number | null) {
  return useQuery({
    queryKey: osmRouteKeys.route(id ?? 0),
    queryFn: () => fetchOsmRoute(id ?? 0),
    enabled: id !== null,
    staleTime: Infinity,
  });
}
