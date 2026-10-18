import { useRef, useState } from 'react';

import type { Ring } from '@/features/routes/geo/ring';
import {
  hotspotLabel,
  parseAliases,
  type HotspotKind,
  type HotspotRow,
} from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { hotspotRefusal } from './hotspot-checks';
import { placeAlreadyNamed } from './places';
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
  // A save in flight, read before the next render has set isBusy: two Enters in
  // one tick must write one box.
  const isSaving = useRef(false);
  // The row a save wrote when its links failed after: the retry updates it
  // rather than writing the box again (useHotspotSave's writtenId).
  const writtenId = useRef<string | null>(null);

  async function save({ kind, name, informal }: NewPlaceFields) {
    // Not before the lines near the box are read: a hintuan's links are worked
    // out on them, and the overviews in their place would link the wrong stretch.
    if (isSaving.current || lined === null) return;
    setError(null);
    if (name.trim() === '') {
      setError('Give the place the name written on the ground.');
      return;
    }
    // A name already standing is that place: the route would end at its terminal,
    // wherever it is, so the editor picks it from the list or names this one apart.
    const named = placeAlreadyNamed(hotspots, { name, informal }, writtenId.current);
    if (named) {
      setError(
        `${hotspotLabel(named)} is already a place: pick it from the list, or give this one its own name.`,
      );
      return;
    }
    const refusal = hotspotRefusal({
      ring,
      kind,
      hotspots,
      hotspotId: writtenId.current,
      name,
      informal,
    });
    if (refusal) {
      setError(refusal);
      return;
    }
    isSaving.current = true;
    setIsBusy(true);
    try {
      const place = await saveHotspot(
        {
          hotspotId: writtenId.current,
          kind,
          name,
          informal,
          aliases: parseAliases('', [name, informal]),
          note: '',
          ring,
          // A terminal's routes are ticked by hand; none is drawn yet to tick.
          directionIds: kind === 'terminal' ? [] : undefined,
          directions: lined,
        },
        (id) => {
          writtenId.current = id;
        },
      );
      onSaved(place);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      isSaving.current = false;
      setIsBusy(false);
    }
  }

  return { isBusy, isReady: lined !== null, error, save };
}
