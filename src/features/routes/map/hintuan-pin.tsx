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
  /** The trip's colour, for its label's name; the circle is Start's green or End's red. */
  livery: Livery;
  /** Given, the name is a button: the public map's lets the pick go. */
  onPick?: () => void;
  /**
   * Which pick it marks: the ride's end, End's pill before the name, or its
   * start, Start's pill (the owner's TimelineRouteDetail).
   */
  marks?: 'end' | 'start';
}

/**
 * The picked hintuan on the map: a circle that pops up where it is, the route
 * left whole, not cut there (the owner's call). It is the timeline's own
 * TimelineDot, Selected, in its pill's colour: a picked start in Start's
 * green, a picked end in End's red, as Figma's HintuanLabel draws them.
 *
 * A DOM marker, like the commuter's own (LocatorIndicatorOverlay): the pop is
 * a CSS animation that costs the map nothing, and it takes no taps, so a tap
 * on it reaches the line or the box beneath. The caller keys it on the pick,
 * so another hintuan pops a fresh circle.
 *
 * Beside it, its name: Figma's HintuanLabel, HintuanEnd (4068:4791), a white
 * "End" pill before the name on red, 8 right of the circle and centred on
 * it; on a train line, CodeSignEnd, the station's code — GL02, PL08, YL13 —
 * in a red pill of its own before the name's. The code
 * shows on the picked station's label alone; the other stations keep their
 * dots, where Figma's LRTHintuanCodes (4051:6426) draws codes (StationLabels;
 * the owner's call). Picked as the end, the hintuan is where the ride ends,
 * the line on from here in the card's pale (useLitRides) and the route's own
 * tail keeps its name without an End pill (EndTitles). Given `onPick`, the name is a
 * button: it lets the pick go, the camera back (the owner's call); the circle
 * still takes no taps. The code is only on the map, so the name's button says
 * it too.
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
      // Says what the tap does: it lets the pick go, opening no routes there.
      nameButtonLabel={
        onPick
          ? `${marks === 'start' ? 'Start' : 'End'}, ${code ? `${code} ` : ''}${label}: let it go`
          : undefined
      }
    />,
    el,
  );
}
