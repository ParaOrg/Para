import { Button } from '@/design-system/primitives/button';
import type { LngLat } from '@/shared/utils/geo';

import { CheckSpotList } from './check-spot-list';
import type { CheckSpot } from './check-spots';
import type { OsmRoute } from './osm-route-schema';

interface OsmRouteHintProps {
  route: OsmRoute;
  spots: CheckSpot[];
  /** Takes the camera to a place to check. */
  onLookAt: (at: LngLat) => void;
  onForget: () => void;
}

/**
 * Over the Playground while a drawing came from an OSM route: which, and the places to check
 * (check-spots.ts), each a button that takes the camera there. A placeholder look, as the
 * upload's hint beside it, until the owner designs it.
 */
export function OsmRouteHint({ route, spots, onLookAt, onForget }: OsmRouteHintProps) {
  return (
    <section
      aria-label="From an OSM route"
      className="absolute top-[calc(1rem+var(--map-safe-top))] left-4 z-10 flex max-h-[calc(100%-2rem)] w-72 max-w-[calc(100%-2rem)] flex-col gap-2 overflow-y-auto rounded-2xl bg-surface p-4 text-sm text-content-secondary shadow-lg ring-1 ring-content-primary/10"
    >
      <h2 className="text-base font-bold text-content-primary">
        From OSM: {route.name || `relation ${route.id}`}
      </h2>
      <p className="text-xs text-content-tertiary">Placeholder look</p>
      <CheckSpotList spots={spots} lineOwner="OSM’s" onLookAt={onLookAt} />
      <p>Fix the line, then press Done and choose its route, direction, ends and boxes.</p>
      <p className="text-xs text-content-tertiary">
        Relation {route.id}, version {route.version}. {route.attribution}, ODbL.
      </p>
      <Button variant="secondary" label="Not from OSM" onClick={onForget} />
    </section>
  );
}
