import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { haversine, type LngLat } from '@/shared/utils/geo';

import { HintuanLabel } from './hintuan-label';
import { useMapMarker, useMarkerElement } from './use-map-marker';
import type { Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import { rowStops, rowsOutsideRide, rowsOutsideStartAlone } from '../model/ride';
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
 * a pick replaces the dot in its spot. Each is the owner's HintuanLabel,
 * Hintuan (Figma 4068:4791, 2026-10-13): the timeline's own TimelineDot at
 * rest and beside it the name, his Label's Default, in the line's colour,
 * SN Pro 14/20, drawn flat (a 12px pill in the card's surface, lifted off
 * the map by a shadow, from 2026-10-02 until then). The dot is ringed in
 * the lit line's colour, the card's surface, so the dot and its name are
 * one colour, as the owner asked ("the circle must be the same color as
 * routeline color lit", 2026-10-12). Past a picked hintuan the line is
 * drawn in the card's surface-pale (useRideRest), and the dots along that
 * rest ring in the same pale — the rows after the picked one, and since a
 * ride's start could be picked (2026-10-15) the rows before it, while the
 * ride is drawn (`hasRide`; his ask of 2026-10-12, with a screenshot: "the
 * circle is still the color of routeline instead of pale color of
 * routeline"). Their names keep the card's surface, the whole label at
 * 60%: the owner's Label, Unselected (Figma 4200:13645, 2026-10-16: "if the
 * label is unselected it would be transparent", "if the route is not
 * selected or not in side the start and end"); from 2026-10-12 until then
 * they kept it whole, white words on the pale not reading. A start picked
 * alone, no ride yet, puts every other row on the pale with the whole line
 * (the owner, 2026-10-16: "When start is only selected can you unselected
 * all the unselected hintuan/station or labels?, and the rouline would be in
 * pale"); until then the trip stayed lit around a lone S.
 *
 * On a train line the dots stay dots: the owner's LRTHintuanCodes (Figma
 * 4051:6426, 2026-10-12) put each station's code, GL02, in its dot's place
 * for a morning ("instead of circle we must show their code"), then went
 * back ("we will go back to circle, but only one is selected it must
 * show"): the picked station's code is on its pin (HintuanPin), and the
 * rest are circles, as a jeepney's hintuans are.
 *
 * The two ends are left to their end titles (EndTitles): the rows leave
 * them out. A picked row, the start's as the end's, is left to its HintuanPin. Once the scale bar
 * reads 3 km only the dots show, smaller. That 3 km is his for
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
  pickedId = null,
  startId = null,
  endPicked = null,
  hasRide = false,
  onPick,
}: {
  map: MapLibreMap;
  selected: Direction;
  hotspots: readonly Hotspot[];
  /** The trip card's hintuan rows (Timeline's `between`), in travel order. */
  rows: readonly TimelineRow[];
  livery: Livery;
  /** The picked row, the ride's end, which its HintuanPin marks. */
  pickedId?: string | null;
  /** The row made the ride's start, which its own HintuanPin marks. */
  startId?: string | null;
  /** An end row picked as the ride's end, the start kept (useRideTo's `endPicked`). */
  endPicked?: 'from' | 'to' | null;
  /** Called with the tapped row's id. */
  onPick?: (rowId: string) => void;
  /**
   * Whether the ride between the picks is drawn (useRideTo's `ridden`), the
   * line outside it in the card's pale (useRideRest): the dots of the rows
   * outside it wear the pale too (rowsOutsideRide, the card's own rule).
   * False with a start picked, no ride yet: every row but the start's is on
   * the pale, the whole line drawn in it. False with nothing picked, and
   * every dot wears the line's colour.
   */
  hasRide?: boolean;
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
  // The rows outside the ride sit along the pale, while it is drawn; with a
  // start and no ride, every row but the start's, the whole line pale
  // (useLitRides).
  const outside = useMemo(() => {
    if (hasRide) return rowsOutsideRide(rows, startId, pickedId, endPicked);
    if (startId !== null) return rowsOutsideStartAlone(rows, startId);
    return null;
  }, [hasRide, rows, startId, pickedId, endPicked]);
  return (
    <>
      {stops.map((s) =>
        s.id === pickedId || s.id === startId ? null : (
          <StationLabel
            key={s.id}
            map={map}
            rowId={s.id}
            at={s.at}
            label={s.label}
            livery={livery}
            named={named}
            paled={outside?.has(s.id) ?? false}
            onPick={onPick}
          />
        ),
      )}
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
  paled,
  onPick,
}: {
  map: MapLibreMap;
  rowId: string;
  at: LngLat;
  label: string;
  livery: Livery;
  named: boolean;
  /** Outside the ride: its dot rings in the card's pale, the line's colour there, and its name is at 60%. */
  paled: boolean;
  onPick?: (rowId: string) => void;
}) {
  const el = useMarkerElement('station-label', 'hintuan-pin station-label');
  // The row's spot moves as the trip's full line lands over its overview
  // (rowStops runs again on the new line): moved there, not made anew (useMapMarker).
  useMapMarker(map, el, at, { anchor: 'center', onTap: () => onPick?.(rowId) });
  // Further out, a smaller dot (hintuanPin.css), so the stations read as
  // beads, not a wall; and along the rest, said for the suites, the ring's
  // colour being the dot's own class.
  useEffect(() => {
    el.toggleAttribute('data-far', !named);
    el.toggleAttribute('data-paled', paled);
  }, [el, named, paled]);
  // The dot and its name are one tap (the owner's ask, 2026-10-02): one button around both.
  const Tap = onPick ? 'button' : 'div';
  return createPortal(
    <Tap
      {...(onPick ? { type: 'button' as const, 'aria-label': label } : {})}
      className="station-label-tap relative flex rounded-full"
    >
      <HintuanLabel variant="hintuan" name={named ? label : null} livery={livery} isPaled={paled} />
    </Tap>,
    el,
  );
}
