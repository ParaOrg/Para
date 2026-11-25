import { useState, type ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';
import type { LngLat } from '@/shared/utils/geo';

import { OsmRouteCard } from './osm-route-card';
import type { OsmRoute, OsmRouteSummary } from './osm-route-schema';
import { osmRoutesNear, searchOsmRoutes } from './search-osm-routes';
import type { RouteLine } from './seed-points';
import { useOsmRouteIndexQuery } from './use-osm-route-index-query';

const KIND_LABEL = { jeepney: 'Jeepney', uv: 'UV Express', bus: 'Bus', rail: 'Rail' } as const;

interface OsmRoutePickerProps {
  /** Where "near the map" looks: the map's centre, read when pressed. */
  mapCentre: () => LngLat | null;
  onStart: (route: OsmRoute, part: RouteLine) => void;
  onClose: () => void;
}

/**
 * The picker for "Start from OSM route" (.scratch/osm-route-start/plan.md): a search by ref, name
 * or relation id, or the routes near the map's centre; then the chosen route's card. A
 * placeholder from the studio's existing parts until the owner designs it.
 */
export function OsmRoutePicker({ mapCentre, onStart, onClose }: OsmRoutePickerProps) {
  const index = useOsmRouteIndexQuery({ isEnabled: true });
  const [query, setQuery] = useState('');
  const [near, setNear] = useState<OsmRouteSummary[] | null>(null);
  const [chosenId, setChosenId] = useState<number | null>(null);

  if (chosenId !== null)
    return (
      <PickerFrame onClose={onClose}>
        <OsmRouteCard id={chosenId} onStart={onStart} onBack={() => setChosenId(null)} />
      </PickerFrame>
    );

  const routes = index.data?.routes ?? [];
  const results = query.trim() !== '' ? searchOsmRoutes(query, routes) : (near ?? []);
  const handleNear = () => {
    const centre = mapCentre();
    if (centre) setNear(osmRoutesNear(centre, routes));
    setQuery('');
  };

  return (
    <PickerFrame onClose={onClose}>
      <TextField
        label="Ref, name or relation id"
        value={query}
        placeholder="T436, Philcoa, r10183711"
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery('')}
      />
      <Button
        variant="secondary"
        size="small"
        label="Routes near the map’s centre"
        disabled={!index.data}
        onClick={handleNear}
      />
      <PickerResults
        status={index.status}
        isAsked={query.trim() !== '' || near !== null}
        results={results}
        onRetry={() => void index.refetch()}
        onChoose={setChosenId}
      />
      {index.data && (
        <p className="text-xs text-content-tertiary">
          OSM data of {index.data.extractAt.slice(0, 10)}. {index.data.attribution}, ODbL.
        </p>
      )}
    </PickerFrame>
  );
}

interface PickerFrameProps {
  children: ReactNode;
  onClose: () => void;
}

/** The panel, where an upload's hint stands, marked as the placeholder it is. */
function PickerFrame({ children, onClose }: PickerFrameProps) {
  return (
    <section
      aria-label="Start from an OSM route"
      className="absolute top-[calc(1rem+var(--map-safe-top))] left-4 z-10 flex max-h-[calc(100%-2rem)] w-80 max-w-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-4 text-sm text-content-secondary shadow-lg ring-1 ring-content-primary/10"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-content-primary">Start from an OSM route</h2>
        <span className="text-xs text-content-tertiary">Placeholder look</span>
      </div>
      {children}
      <Button variant="secondary" label="Close" onClick={onClose} />
    </section>
  );
}

interface PickerResultsProps {
  status: 'pending' | 'error' | 'success';
  isAsked: boolean;
  results: OsmRouteSummary[];
  onRetry: () => void;
  onChoose: (id: number) => void;
}

/** The routes found, or what is happening instead: loading, failed, nothing asked, none found. */
function PickerResults({ status, isAsked, results, onRetry, onChoose }: PickerResultsProps) {
  if (status === 'pending') return <p>Reading the OSM routes…</p>;
  if (status === 'error')
    return (
      <p className="flex items-baseline gap-2">
        The OSM routes didn’t load.
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Try again
        </button>
      </p>
    );
  if (!isAsked) return <p>Type a route’s ref or name, or look near the map’s centre.</p>;
  if (results.length === 0) return <p>No OSM route matches.</p>;
  return (
    <ul aria-label="OSM routes" className="flex flex-col gap-1">
      {results.map((route) => (
        <li key={route.id}>
          <button
            type="button"
            onClick={() => onChoose(route.id)}
            className="flex w-full flex-col rounded-xl p-2 text-left hover:bg-surface-secondary focus-visible:bg-surface-secondary"
          >
            <span className="font-semibold text-content-primary">
              {route.name || `Relation ${route.id}`}
            </span>
            <span className="text-xs text-content-tertiary">
              {KIND_LABEL[route.kind]}
              {route.ref && ` · ${route.ref}`}
              {route.gapCount > 0 && ` · ${route.gapCount} gaps`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
