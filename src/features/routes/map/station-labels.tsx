import { Marker, type MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { haversine, type LngLat } from '@/shared/utils/geo';

import { tapsOnItsButton } from './marker-tap';
import { CARD_SURFACE, CARD_TEXT } from '../cards/livery-card';
import { TimelineDot } from '../cards/trip-timeline';
import type { Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import { rowStops } from '../model/ride';
import type { Direction } from '../model/routes';
import type { TimelineRow } from '../model/timeline';
import './hintuan-pin.css';

/** The scale bar's width (MapView's ScaleControl, MapLibre's default maxWidth). */
const SCALE_PX = 100;

/** How much ground the scale bar's width may span with the names still on: under 3 km. */
const NAMES_UNTIL_M = 3000;

/**
 * Whether the names show: until the scale bar reads 3 km — the owner's
 * asks of 2026-10-02, "as zoomed out to 1km it will be removed", then
 * 1.5 km, 2 km, then "try 3km". Measured the way the bar measures itself,
 * across its width at the map's middle height: it reads 2 km up to
 * 3,000 m, so the names stay through its 2 km and go at its 3 km.
 * Further out, the dots alone, so the pills never pile up.
 */
function namesShow(map: MapLibreMap): boolean {
  const y = map.getContainer().clientHeight / 2;
  return (
    haversine(map.unproject([0, y]).toArray(), map.unproject([SCALE_PX, y]).toArray()) <
    NAMES_UNTIL_M
  );
}

/**
 * The selected direction's hintuans along its line, a dot at each with
 * its name beside it: a train's or the ferry's stations (the owner's asks
 * of 2026-10-02 and 2026-10-03) and, since 2026-10-12, a jeepney's
 * hintuans the same way (his ask: "if the route is selected specially
 * jeepney, it must show their hintuans similar to LRT, MRT, and Ferry").
 * One dot per row of the trip card's timeline (`rows`, its `between`),
 * on the line at the middle of the stretch past the row's box, where the
 * picked circle pops (rowStops; his "middle of the line", 2026-10-12), so
 * a pick replaces the dot in its spot. The name is the owner's
 * RouteLineLabel: SelectedHintuanRouteTitle's Default (Figma 3846:11748)
 * as he drew it on 2026-10-02, a pill in the trip card's surface and
 * words, lifted off the map, as the picked hintuan's own was. Kept so on
 * 2026-10-12, when his redrawing put the pin's in End's blue with its E,
 * drawn flat, and the Default itself in the brand's blue
 * (SelectedHintuanRouteTitle, which draws no pill here): whether this
 * label follows is his to say. The dot is the timeline's own TimelineDot
 * at rest, ringed
 * in the lit line's colour, the card's surface, so the dot and its name
 * are one colour, as the owner asked ("the circle must be the same color
 * as routeline color lit", 2026-10-12).
 *
 * On a train line the dots stay dots: the owner's LRTHintuanCodes (Figma
 * 4051:6426, 2026-10-12) put each station's code, GL02, in its dot's place
 * for a morning ("instead of circle we must show their code"), then went
 * back ("we will go back to circle, but only one is selected it must
 * show"): the picked station's code is on its pin (HintuanPin), and the
 * rest are circles, as a jeepney's hintuans are.
 *
 * The two ends are left to their end titles (EndTitles): the rows leave
 * them out. A picked row is left to its HintuanPin. Once the scale bar
 * reads 3 km only the dots show, smaller. The names are 12px, the picked
 * one's pill 14px (the owner's ask, 2026-10-02). That 3 km is his for
 * stations a kilometre or two apart; a jeepney's hintuans sit a few
 * hundred metres apart, so at the bar's 2 km their names overlap — kept at
 * 3 km until he says otherwise (asked, 2026-10-12). Given `onPick`, the
 * dot and its name are one button that hands it the row's id, as the
 * row's tap on the card does (useRideTo's pick): the public map and the
 * studio both pick it. A long jeepney trip is thirty or forty of these
 * markers, each a button MapLibre re-projects at every move — the one
 * place a trip puts dozens of DOM markers on the map, as many as the end
 * titles at their most, which the cheap-phone plan should count. Still
 * named for the stations it began with; a jeepney's hintuans ride along
 * until the refactor renames it.
 */
export function StationLabels({
  map,
  selected,
  hotspots,
  rows,
  livery,
  pickedId,
  onPick,
}: {
  map: MapLibreMap;
  selected: Direction;
  hotspots: readonly Hotspot[];
  /** The trip card's hintuan rows (Timeline's `between`), in travel order. */
  rows: readonly TimelineRow[];
  livery: Livery;
  /** The picked row, which its HintuanPin marks. */
  pickedId?: string | null;
  /** Called with the tapped row's id. */
  onPick?: (rowId: string) => void;
}) {
  const [named, setNamed] = useState(() => namesShow(map));
  useEffect(() => {
    const on = () => setNamed(namesShow(map));
    // On every move, as the bar itself: its metres change with the latitude too.
    map.on('move', on);
    return () => {
      map.off('move', on);
    };
  }, [map]);

  // Where each row sits: worked out as the trip, the hotspots or the rows
  // change, not at each move of the map.
  const stops = useMemo(() => rowStops(selected, hotspots, rows), [selected, hotspots, rows]);
  return (
    <>
      {stops
        .filter((s) => s.id !== pickedId)
        .map((s) => (
          <StationLabel
            key={s.id}
            map={map}
            rowId={s.id}
            at={s.at}
            label={s.label}
            livery={livery}
            named={named}
            onPick={onPick}
          />
        ))}
    </>
  );
}

function StationLabel({
  map,
  rowId,
  at,
  label,
  livery,
  named,
  onPick,
}: {
  map: MapLibreMap;
  rowId: string;
  at: LngLat;
  label: string;
  livery: Livery;
  named: boolean;
  onPick?: (rowId: string) => void;
}) {
  const [el] = useState(() => {
    const div = document.createElement('div');
    div.className = 'hintuan-pin station-label';
    div.dataset.testid = 'station-label';
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

  // The row's spot moves as the trip's full line lands over its overview
  // (rowStops runs again on the new line): the marker is moved there, not
  // made anew, which would pop its dot a second time and jump it from the
  // overview's point (HintuanPin's way; the ds-reviewer's finding, 2026-10-12).
  useEffect(() => {
    marker.current?.setLngLat(at);
  }, [at]);
  // Read as the tap comes: a fresh function each render binds nothing anew (HintuanPin).
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => tapsOnItsButton(el, () => pick.current?.(rowId)), [el, rowId]);

  // Further out, a smaller dot (hintuanPin.css), so the stations read as beads, not a wall.
  el.toggleAttribute('data-far', !named);
  // The dot and its name are one tap (the owner's ask, 2026-10-02): one button around both.
  const Tap = onPick ? 'button' : 'div';
  return createPortal(
    <Tap
      {...(onPick ? { type: 'button' as const, 'aria-label': label } : {})}
      className="station-label-tap relative flex rounded-full"
    >
      <TimelineDot rail={CARD_SURFACE[livery]} />
      {named && (
        // 10 after the dot (3847:11777).
        <span className="hintuan-pin-title absolute top-1/2 left-full ml-2.5 flex max-w-56">
          <span
            data-testid="station-label-title"
            className={
              'max-w-full truncate rounded-full px-2 py-1 text-xs/4 font-medium shadow-selected-hintuan-route-title ' +
              CARD_SURFACE[livery] +
              ' ' +
              CARD_TEXT[livery]
            }
          >
            {label}
          </span>
        </span>
      )}
    </Tap>,
    el,
  );
}
