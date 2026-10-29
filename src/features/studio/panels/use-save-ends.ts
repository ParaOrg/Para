import { useMemo, useRef, useState } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow, RouteRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { NEW_PLACE_KEY } from './place-picker';
import { boxFor, endsByHead, groupPlaces, guessEnds, placeOfBox } from './places';

interface UseSaveEndsOptions {
  /** Every saved hotspot. */
  savedHotspots: HotspotRow[];
  /** The direction being edited, if this is an edit. */
  existing: DirectionRow | null;
  /** The route the line belongs to: the edited one's, or the parent of a return trip. */
  parent: RouteRow | null;
  /** The drawing's control points. */
  line: LngLat[];
  directions: DirectionRow[];
  /** Hears of a place made from the pickers, so the map's own list is read again. */
  onPlaceSaved?: () => void;
}

/**
 * The save panel's two ends: the places to pick from (the saved ones and any
 * made here), the box picked at each end, and the form that makes a new
 * place for one of them.
 */
export function useSaveEnds({
  savedHotspots,
  existing,
  parent,
  line,
  directions,
  onPlaceSaved,
}: UseSaveEndsOptions) {
  // The places made here, kept beside the saved ones until the map's list has them.
  const [made, setMade] = useState<HotspotRow[]>([]);
  const hotspots = useMemo(
    () => [...savedHotspots, ...made.filter((m) => !savedHotspots.some((s) => s.id === m.id))],
    [savedHotspots, made],
  );
  const [making, setMaking] = useState<'Head' | 'Tail' | null>(null);
  const headSelect = useRef<HTMLSelectElement>(null);
  const tailSelect = useRef<HTMLSelectElement>(null);
  const places = useMemo(() => groupPlaces(hotspots), [hotspots]);
  // Where a picked end's box is looked for: the end of the line nearer the
  // route's head, whichever way it was drawn.
  const headNow = existing
    ? hotspots.find((s) => s.id === existing.route.headHotspotId)
    : undefined;
  const [nearHead, nearTail] = endsByHead(line, headNow);

  // The ends are the route's: a return trip takes them as they are, and Edit
  // route starts from them; a new route's are guessed from where the line
  // actually starts and finishes, once, and corrected by hand when the guess
  // is wrong.
  const [firstGuess] = useState(() => guessEnds(places, hotspots, line, directions));
  const [headId, setHeadId] = useState(parent?.headHotspotId ?? firstGuess[0]);
  const [tailId, setTailId] = useState(parent?.tailHotspotId ?? firstGuess[1]);

  const head = hotspots.find((s) => s.id === headId);
  const tail = hotspots.find((s) => s.id === tailId);
  const headPlace = head ? placeOfBox(places, head.id) : undefined;
  const tailPlace = tail ? placeOfBox(places, tail.id) : undefined;

  const pickPlace = (key: string, to: LngLat | undefined) => {
    const place = places.find((p) => p.key === key);
    return place ? boxFor(place, to) : '';
  };
  const pickHead = (key: string) =>
    key === NEW_PLACE_KEY ? setMaking('Head') : setHeadId(pickPlace(key, nearHead));
  const pickTail = (key: string) =>
    key === NEW_PLACE_KEY ? setMaking('Tail') : setTailId(pickPlace(key, nearTail));

  /** Back to the picker that asked for the form. */
  const closeMaking = () => {
    const picker = making === 'Head' ? headSelect : tailSelect;
    setMaking(null);
    picker.current?.focus();
  };

  // The new place becomes that end: the box its place is reached by, as picking it would.
  const handlePlaceSaved = (place: HotspotRow) => {
    setMade((previous) => [...previous, place]);
    const next = groupPlaces([...hotspots, place]);
    const placeNow = placeOfBox(next, place.id);
    const isHead = making === 'Head';
    const box = placeNow ? boxFor(placeNow, isHead ? nearHead : nearTail) : place.id;
    if (isHead) setHeadId(box);
    else setTailId(box);
    onPlaceSaved?.();
    closeMaking();
  };

  return {
    hotspots,
    places,
    headId,
    tailId,
    head,
    tail,
    headPlace,
    tailPlace,
    nearHead,
    nearTail,
    making,
    headSelect,
    tailSelect,
    pickHead,
    pickTail,
    closeMaking,
    handlePlaceSaved,
  };
}
