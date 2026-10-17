import { useState } from 'react';

import type { Ring } from '@/features/routes/geo/ring';
import { parseAliases, type HotspotKind, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { hotspotRefusal } from './hotspot-checks';
import { useNearLines } from './use-near-lines';
import { saveHotspot } from '../data/hotspots-write';

interface UseNewPlaceSaveOptions {
  ring: Ring;
  hotspots: HotspotRow[];
  directions: DirectionRow[];
  onSaved: (place: HotspotRow) => void;
}

interface NewPlaceFields {
  kind: HotspotKind;
  name: string;
  informal: string;
}

/**
 * The save of a place made from the route's save panel: the hotspot panel's
 * own checks (hotspotRefusal) and its own write (saveHotspot), so a place made
 * here has the refusals and the links of one drawn on the map. Ready once the
 * lines near the box are read, which its links are worked out on.
 */
export function useNewPlaceSave({ ring, hotspots, directions, onSaved }: UseNewPlaceSaveOptions) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lined = useNearLines(ring, directions, setError);

  async function save({ kind, name, informal }: NewPlaceFields) {
    setError(null);
    if (name.trim() === '') {
      setError('Give the place the name written on the ground.');
      return;
    }
    const refusal = hotspotRefusal({ ring, kind, hotspots, hotspotId: null, name, informal });
    if (refusal) {
      setError(refusal);
      return;
    }
    setIsBusy(true);
    try {
      const place = await saveHotspot({
        hotspotId: null,
        kind,
        name,
        informal,
        aliases: parseAliases('', [name, informal]),
        note: '',
        ring,
        // A terminal's routes are ticked by hand; none is drawn yet to tick.
        directionIds: kind === 'terminal' ? [] : undefined,
        directions: lined ?? directions,
      });
      onSaved(place);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsBusy(false);
    }
  }

  return { isBusy, isReady: lined !== null, error, save };
}
