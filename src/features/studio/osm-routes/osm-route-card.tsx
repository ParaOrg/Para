import { Button } from '@/design-system/primitives/button';

import type { OsmRoute } from './osm-route-schema';
import { splitAtTurnaround, turnaroundIndex, type RouteLine } from './seed-points';
import { useOsmRouteQuery } from './use-osm-route-query';

/** A route with more gaps than this, or one wider than TOO_WIDE_M, is better traced by hand. */
const MANY_GAPS = 3;
const TOO_WIDE_M = 500;

interface OsmRouteCardProps {
  id: number;
  onStart: (route: OsmRoute, part: RouteLine) => void;
  onBack: () => void;
}

/**
 * A chosen OSM route before its drawing starts: what it is and where it comes from (its relation,
 * version, last edit and the mapper's own source tags), so the editor knows what they start from.
 */
export function OsmRouteCard({ id, onStart, onBack }: OsmRouteCardProps) {
  const read = useOsmRouteQuery(id);
  const back = (
    <Button variant="secondary" size="small" label="Back to the list" onClick={onBack} />
  );

  if (read.status === 'pending') return <p>Reading relation {id}…</p>;
  if (read.status === 'error')
    return (
      <>
        <p>Relation {id} didn’t load.</p>
        <Button
          variant="secondary"
          size="small"
          label="Try again"
          onClick={() => void read.refetch()}
        />
        {back}
      </>
    );

  const route = read.data;
  const turn = turnaroundIndex(route);
  const halves = turn === null ? null : splitAtTurnaround(route, turn);
  const isTooBroken =
    route.gaps.length > MANY_GAPS || route.gaps.some(({ metres }) => metres > TOO_WIDE_M);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-content-primary">
          {route.name || `Relation ${route.id}`}
        </h3>
        {(route.from || route.to) && (
          <p>
            {route.from || '?'} → {route.to || '?'}
          </p>
        )}
        <p className="text-xs">
          <a
            href={`https://www.openstreetmap.org/relation/${route.id}/history`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Relation {route.id}
          </a>
          , version {route.version}, last edited {route.lastEdit}
        </p>
        <p className="text-xs">
          {[route.network, route.operator].filter(Boolean).join(' · ') || 'No network named'}
        </p>
        <p className="text-xs">
          {route.gaps.length} gaps · {route.stops.length} stops mapped
          {route.isClipped && ' · clipped to the map’s area'}
        </p>
        {Object.entries(route.provenance).map(([key, value]) => (
          <p key={key} className="text-xs">
            {key}: {value}
          </p>
        ))}
        <p className="text-xs text-content-tertiary">
          Hand-mapped by OSM volunteers. Check it on the ground before approving.{' '}
          {route.attribution}, ODbL.
        </p>
      </div>
      {isTooBroken && <p>Too broken to seed well: tracing by hand may be quicker.</p>}
      {halves ? (
        <>
          <Button
            variant="primary"
            label="Draw the way out"
            onClick={() => onStart(route, halves[0])}
          />
          <Button
            variant="primary"
            label="Draw the way back"
            onClick={() => onStart(route, halves[1])}
          />
        </>
      ) : (
        <Button variant="primary" label="Start drawing" onClick={() => onStart(route, route)} />
      )}
      {back}
    </>
  );
}
