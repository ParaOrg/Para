import { Button } from '@/design-system/primitives/button';
import type { LngLat } from '@/shared/utils/geo';

import type { CheckSpot } from './check-spots';
import type { OsmRoute } from './osm-route-schema';

interface OsmRouteHintProps {
  route: OsmRoute;
  spots: CheckSpot[];
  /** Takes the camera to a place to check. */
  onLookAt: (at: LngLat) => void;
  onForget: () => void;
}

const spotWords = (spot: CheckSpot) =>
  spot.kind === 'gap'
    ? `A ${spot.metres} m gap in OSM’s line, bridged by the router`
    : `The line strays up to ${spot.metres} m from OSM’s`;

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
      <p>
        {spots.length === 0
          ? 'Nothing to check against OSM’s line yet.'
          : `${spots.length} ${spots.length === 1 ? 'place' : 'places'} to check`}
      </p>
      {spots.length > 0 && (
        <ol className="flex flex-col gap-1">
          {spots.map((spot, index) => (
            <li key={`${spot.kind}-${spot.at.join(',')}`}>
              <button
                type="button"
                onClick={() => onLookAt(spot.at)}
                className="w-full rounded-xl p-2 text-left hover:bg-surface-secondary focus-visible:bg-surface-secondary"
              >
                {index + 1}. {spotWords(spot)}
              </button>
            </li>
          ))}
        </ol>
      )}
      <p>Fix the line, then press Done and choose its route, direction, ends and boxes.</p>
      <p className="text-xs text-content-tertiary">
        Relation {route.id}, version {route.version}. {route.attribution}, ODbL.
      </p>
      <Button variant="secondary" label="Not from OSM" onClick={onForget} />
    </section>
  );
}
