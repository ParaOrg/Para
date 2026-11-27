import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';
import type { LngLat } from '@/shared/utils/geo';

import { OldParaRouteCard } from './old-para-route-card';
import { OldParaRouteResults } from './old-para-route-results';
import type { OldParaRoute, OldParaRouteSummary } from './old-para-route-schema';
import { oldParaRoutesNear, searchOldParaRoutes } from './search-old-para-routes';
import { useOldParaRouteIndexQuery } from './use-old-para-route-index-query';
import type { RouteLine } from '../osm-routes/seed-points';
import { StartPickerFrame } from '../osm-routes/start-picker-frame';

const TITLE = 'Start from an old Para route';

interface OldParaRoutePickerProps {
  /** Where "near the map" looks: the map's centre, read when pressed. */
  mapCentre: () => LngLat | null;
  onStartFromLine: (route: OldParaRoute, part: RouteLine) => void;
  onStartFromEnds: (route: OldParaRouteSummary) => void;
  onClose: () => void;
}

/**
 * The picker for "Start from an old Para route" (.scratch/old-para-routes/spec.md), as the OSM
 * one: a search by name, a place in it, or Para ID, or the routes with a line near the map's
 * centre; then the chosen route's card. A placeholder look until the owner designs it.
 */
export function OldParaRoutePicker({
  mapCentre,
  onStartFromLine,
  onStartFromEnds,
  onClose,
}: OldParaRoutePickerProps) {
  const index = useOldParaRouteIndexQuery();
  const [query, setQuery] = useState('');
  const [near, setNear] = useState<OldParaRouteSummary[] | null>(null);
  const [chosen, setChosen] = useState<OldParaRouteSummary | null>(null);

  if (chosen)
    return (
      <StartPickerFrame title={TITLE} onClose={onClose}>
        <OldParaRouteCard
          route={chosen}
          onStartFromLine={onStartFromLine}
          onStartFromEnds={onStartFromEnds}
          onBack={() => setChosen(null)}
        />
      </StartPickerFrame>
    );

  const routes = index.data ?? [];
  const results = query.trim() !== '' ? searchOldParaRoutes(query, routes) : (near ?? []);
  const handleNear = () => {
    const centre = mapCentre();
    if (centre) setNear(oldParaRoutesNear(centre, routes));
    setQuery('');
  };

  return (
    <StartPickerFrame title={TITLE} onClose={onClose}>
      <TextField
        label="Name, place or Para ID"
        value={query}
        placeholder="UP - Ikot, Cubao, PARA-0123"
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
      <OldParaRouteResults
        status={index.status}
        isAsked={query.trim() !== '' || near !== null}
        results={results}
        onRetry={() => void index.refetch()}
        onChoose={setChosen}
      />
      {index.data && (
        <p className="text-xs text-content-tertiary">
          {index.data.length} routes from the old Para app’s community, most never reviewed.
        </p>
      )}
    </StartPickerFrame>
  );
}
