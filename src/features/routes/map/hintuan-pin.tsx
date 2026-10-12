import { Marker, type MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { LngLat } from '@/shared/utils/geo';

import { tapsOnItsButton } from './marker-tap';
import { SelectedHintuanRouteTitle } from './selected-hintuan-route-title';
import { CARD_SURFACE, CARD_TEXT } from '../cards/livery-card';
import { TimelineDot } from '../cards/trip-timeline';
import type { Livery } from '../model/liveries';
import './hintuan-pin.css';

interface Props {
  map: MapLibreMap;
  /** Where the picked hintuan is (useRideTo's `pinAt`). */
  at: LngLat;
  /** The hintuan's name, written beside the circle; none, and the circle stands alone. */
  label?: string | null;
  /**
   * A train station's code, GL02, in a box left of the circle (useRideTo's
   * `pickedCode`); null for a jeepney's hintuan, the ferry's, and a station
   * the table does not know.
   */
  code?: string | null;
  /** The trip's colour: the circle is ringed in its line's, the card's surface. */
  livery: Livery;
  /** Given, the name is a button: the public map's lets the pick go. */
  onPick?: () => void;
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
 * colour with the line it sits on and the dots along it (StationLabels).
 *
 * A DOM marker, like the visitor's own (LocatorIndicatorOverlay): the pop
 * is a CSS animation that costs the map nothing, and it takes no taps, so
 * a tap on it reaches the line or the box beneath. The caller keys it on the pick, so another hintuan pops a
 * fresh circle.
 *
 * Beside it, its name (the owner's SelectedHintuanRouteTitle, Figma
 * 3847:11777, 2026-09-30): a pill 12 right of the circle (10 until his
 * LRTHintuanCodes of 2026-10-12, 4051:6426) and centred on it, so the
 * circle stays on the point the marker is anchored to. It is the
 * Tail Route, one drawing with the end titles' (SelectedHintuanRouteTitle):
 * End's blue with its circled E before the name, white words, drawn flat
 * (his redrawing of 2026-10-12, 3848:12135: "blue is the end"; the trip
 * card's surface and words until then, lifted off the map by a shadow,
 * 3847:11760, and the word End over the name from 2026-10-02 until his
 * icons). Picked, the hintuan is where the ride ends, so the chevrons
 * stop here (useLitRides) and the route's own tail keeps its name without
 * an E (EndTitles). Given `onPick`, the name is a button (it opened the
 * hintuan's place, the owner's ask of 2026-10-01, until his of 2026-10-03:
 * it lets the pick go, the camera back); the circle still takes no taps.
 *
 * Left of the circle, on a train line, the station's code — GL02, PL08,
 * YL13 — in a rounded box, 12 from the circle as the name is (the owner's
 * LRTHintuanCodes, Figma 4051:6426, 2026-10-12). The codes stood in place
 * of every station's dot for a morning (StationLabels), until his "we will
 * go back to circle, but only one is selected it must show": the picked
 * one's alone, here. The box wears the lit line's colour, the circle's,
 * until his per-line branding lands: he drew it in the brand's blue as a
 * stand-in and asked for that theme to wait on him. The code is only on
 * the map, so the name's button says it too.
 */
export function HintuanPin({ map, at, label, code, livery, onPick }: Props) {
  const [el] = useState(() => {
    const div = document.createElement('div');
    div.className = 'hintuan-pin';
    div.dataset.testid = 'hintuan-pin';
    return div;
  });
  const marker = useRef<Marker | null>(null);

  useEffect(() => {
    const m = new Marker({ element: el, anchor: 'center' }).setLngLat(at).addTo(map);
    marker.current = m;
    return () => {
      m.remove();
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- made once per map; the effect below moves it
  }, [map, el]);

  // The line's point for a pick can land a moment after the pick itself.
  useEffect(() => {
    marker.current?.setLngLat(at);
  }, [at]);

  // Read as the tap comes: a fresh function each render binds nothing anew.
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => tapsOnItsButton(el, () => pick.current?.()), [el]);

  el.dataset.livery = livery;
  const Title = onPick ? 'button' : 'div';
  // Popped, and untucked from a rail it has none of, by hintuanPin.css.
  return createPortal(
    <>
      {code && (
        <span
          data-testid="hintuan-pin-code"
          className={
            'hintuan-pin-code absolute top-1/2 right-full mr-3 rounded-lg px-2 py-1 text-sm/5 font-medium ' +
            CARD_SURFACE[livery] +
            ' ' +
            CARD_TEXT[livery]
          }
        >
          {code}
        </span>
      )}
      <TimelineDot rail={CARD_SURFACE[livery]} selected />
      {label && (
        <Title
          // Says what the tap does since the owner's ask of 2026-10-03: it
          // lets the pick go, no longer opening the routes there.
          {...(onPick
            ? {
                type: 'button' as const,
                'aria-label': `End, ${code ? `${code} ` : ''}${label}: let it go`,
              }
            : {})}
          data-testid="hintuan-pin-title"
          className="hintuan-pin-title absolute top-1/2 left-full ml-3 flex max-w-64"
        >
          <SelectedHintuanRouteTitle variant="tail" name={label} />
        </Title>
      )}
    </>,
    el,
  );
}
