import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import type { LngLat } from '@/shared/utils/geo';

import { HintuanLabel } from './hintuan-label';
import { useMapMarker, useMarkerElement } from './use-map-marker';
import type { Livery } from '../model/liveries';

import './hintuan-pin.css';

interface Props {
  map: MapLibreMap;
  /** Where the picked hintuan is (useRideTo's `pinAt`). */
  at: LngLat;
  /** The hintuan's name, written beside the circle; none, and the circle stands alone. */
  label?: string | null;
  /**
   * A train station's code, GL02, in a chip before its name (useRideTo's
   * `pickedCode`); null for a jeepney's hintuan, the ferry's, and a station
   * the table does not know.
   */
  code?: string | null;
  /** The trip's colour: the circle is ringed in its line's, the card's surface. */
  livery: Livery;
  /** Given, the name is a button: the public map's lets the pick go. */
  onPick?: () => void;
  /**
   * Which pick it marks: the ride's end, End's E before the name, or its
   * start, Start's S (the owner's TimelineRouteDetail, 2026-10-15).
   */
  marks?: 'end' | 'start';
}

/**
 * The picked hintuan on the map: a circle that pops up where it is, the
 * route left whole — the owner's ask of 2026-09-30: "now I don't want to
 * cut the route, but we still select hintuan it is just the a circle will
 * pop up when that hintuan is selected". It is the timeline's own
 * TimelineDot, Selected, ringed in the lit line's colour, the card's
 * surface (the owner's call of 2026-10-12, "match the line"; the card's
 * rail colour, Card/<livery>/Timeline/surface, until then), so the map and
 * the card point at the same place the same way, and the circle is one
 * colour with the line it sits on and the dots before it (StationLabels;
 * past it, the line and its dots are the card's pale, useRideRest).
 *
 * A DOM marker, like the visitor's own (LocatorIndicatorOverlay): the pop
 * is a CSS animation that costs the map nothing, and it takes no taps, so
 * a tap on it reaches the line or the box beneath. The caller keys it on the pick, so another hintuan pops a
 * fresh circle.
 *
 * Beside it, its name: the owner's HintuanLabel, HintuanEnd (Figma
 * 4068:4791, 2026-10-13), End's E before the name in the line's colour, 10
 * right of the circle and centred on it; on a train line, CodeSignEnd, the
 * station's code — GL02, PL08, YL13 — in a white chip before the name and
 * the E in a disc of its own. Until 2026-10-13 the name wore the brand's
 * blue (3848:12135, 2026-10-12) and the code stood in a box left of the
 * circle (LRTHintuanCodes, 4051:6426). The codes stood in place of every
 * station's dot for a morning (StationLabels), until his "we will go back
 * to circle, but only one is selected it must show": the picked one's
 * alone, here. Picked, the hintuan is where the ride ends, the line on from
 * here in the card's pale (useLitRides) and the route's own tail keeps its name without
 * an E (EndTitles). Given `onPick`, the name is a button (it opened the
 * hintuan's place, the owner's ask of 2026-10-01, until his of 2026-10-03:
 * it lets the pick go, the camera back); the circle still takes no taps.
 * The code is only on the map, so the name's button says it too.
 */
export function HintuanPin({ map, at, label, code, livery, onPick, marks = 'end' }: Props) {
  const el = useMarkerElement('hintuan-pin', 'hintuan-pin');
  // Moved, not made anew: the line's point for a pick can land a moment after the pick itself.
  useMapMarker(map, el, at, { anchor: 'center', onTap: onPick });
  // For the suites: the card's colour it wears.
  useEffect(() => {
    el.setAttribute('data-livery', livery);
    el.setAttribute('data-marks', marks);
  }, [el, livery, marks]);

  // Popped by hintuan-pin.css, its label by hintuan-label.css.
  return createPortal(
    <HintuanLabel
      variant={marks === 'start' ? 'hintuan-start' : 'hintuan-end'}
      name={label ?? null}
      livery={livery}
      codeSign={code}
      // Says what the tap does since the owner's ask of 2026-10-03: it lets
      // the pick go, no longer opening the routes there.
      nameButtonLabel={
        onPick
          ? `${marks === 'start' ? 'Start' : 'End'}, ${code ? `${code} ` : ''}${label}: let it go`
          : undefined
      }
    />,
    el,
  );
}
