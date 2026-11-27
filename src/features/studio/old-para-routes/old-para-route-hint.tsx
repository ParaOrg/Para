import { Button } from '@/design-system/primitives/button';
import type { LngLat } from '@/shared/utils/geo';

import type { OldParaStart } from './use-old-para-route-start';
import { CheckSpotList } from '../osm-routes/check-spot-list';
import type { CheckSpot } from '../osm-routes/check-spots';

interface OldParaRouteHintProps {
  start: OldParaStart;
  spots: CheckSpot[];
  /** Takes the camera to a place to check, or to the end to draw to. */
  onLookAt: (at: LngLat) => void;
  onForget: () => void;
}

/**
 * Over the Playground while a drawing came from an old Para route: which, and the places to
 * check against its line, or, for one with no line, the way to its end. A placeholder look, as
 * the OSM hint's, until the owner designs it.
 */
export function OldParaRouteHint({ start, spots, onLookAt, onForget }: OldParaRouteHintProps) {
  const { end } = start;
  return (
    <section
      aria-label="From an old Para route"
      className="absolute top-[calc(1rem+var(--map-safe-top))] left-4 z-10 flex max-h-[calc(100%-2rem)] w-72 max-w-[calc(100%-2rem)] flex-col gap-2 overflow-y-auto rounded-2xl bg-surface p-4 text-sm text-content-secondary shadow-lg ring-1 ring-content-primary/10"
    >
      <h2 className="text-base font-bold text-content-primary">From old Para: {start.name}</h2>
      <p className="text-xs text-content-tertiary">Placeholder look</p>
      {start.part ? (
        <CheckSpotList spots={spots} lineOwner="the old route’s" onLookAt={onLookAt} />
      ) : (
        <p>The old app has no line for it: draw it by hand along the streets it takes.</p>
      )}
      {end && (
        <Button
          variant="secondary"
          size="small"
          label="Look at its end"
          onClick={() => onLookAt(end)}
        />
      )}
      <p>Fix the line, then press Done and choose its route, direction, ends and boxes.</p>
      <p className="text-xs text-content-tertiary">{start.paraId}, from the old Para app.</p>
      <Button variant="secondary" label="Not from old Para" onClick={onForget} />
    </section>
  );
}
