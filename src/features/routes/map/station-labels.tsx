import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { haversine, type LngLat } from '@/shared/utils/geo';

import { HintuanLabel } from './hintuan-label';
import { useMapMarker, useMarkerElement } from './use-map-marker';
import type { Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import { rowStops } from '../model/ride';
import { rowsOutsideRide, rowsOutsideStartAlone } from '../model/ride-rows';
import type { Direction } from '../model/routes';
import type { TimelineRow } from '../model/timeline';

import './hintuan-pin.css';

/** The scale bar's width (MapView's ScaleControl, MapLibre's default maxWidth). */
const SCALE_PX = 100;

/** How much ground the scale bar's width may span with the names still on: under 3 km. */
const NAMES_UNTIL_M = 3000;

/**
 * Whether the names show: until the scale bar reads 3 km (the owner's call).
 * Measured the way the bar measures itself, across its width at the map's
 * middle height: it reads 2 km up to 3,000 m, so the names stay through its
 * 2 km and go at its 3 km. Further out, the dots alone, so the pills never
 * pile up.
 */
function namesShow(map: MapLibreMap): boolean {
  const y = map.getContainer().clientHeight / 2;
  return (
    haversine(map.unproject([0, y]).toArray(), map.unproject([SCALE_PX, y]).toArray()) <
    NAMES_UNTIL_M
  );
}

/**
 * The selected direction's hintuans along its line, a dot at each with its
 * name beside it: a train's or the ferry's stations and a jeepney's hintuans
 * alike. One dot per row of the trip card's timeline (`rows`, its `between`),
 * on the line at the middle of the stretch past the row's box, where the
 * picked circle pops (rowStops; the owner's call), so a pick replaces the dot
 * in its spot. Each is Figma's HintuanLabel, Hintuan (4068:4791): the
 * timeline's own TimelineDot at rest and beside it the name, the Label's
 * Default, in the line's colour, SN Pro 14/20, drawn flat. The dot is ringed
 * in the lit line's colour, the card's surface, so the dot and its name are
 * one colour. Past a picked hintuan the line is drawn in the card's
 * surface-pale (useRideRest), and the dots along that rest ring in the same
 * pale — the rows after the picked one, and, since a ride's start can be
 * picked, the rows before it, while the ride is drawn (`hasRide`). Their
 * names keep the card's surface, the whole label at 60%: the Label's
 * Unselected (Figma 4200:13645). A start picked alone, no ride yet, puts
 * every other row on the pale with the whole line. All of these are the
 * owner's calls.
 *
 * On a train line the dots stay dots, not Figma's LRTHintuanCodes
 * (4051:6426), each station's code in its dot's place: the picked station's
 * code, GL02, is on its pin (HintuanPin), and the rest are circles, as a
 * jeepney's hintuans are (the owner's call).
 *
 * The two ends are left to their end titles (EndTitles): the rows leave them
 * out. A picked row, the start's as the end's, is left to its HintuanPin.
 * Once the scale bar reads 3 km only the dots show, smaller. That 3 km is the
 * owner's call for stations a kilometre or two apart; a jeepney's hintuans sit
 * a few hundred metres apart, so at the bar's 2 km their names overlap — kept
 * at 3 km until the owner says otherwise. Given `onPick`, the dot and its name
 * are one button that hands it the row's id, as the row's tap on the card does
 * (useRideTo's pick): the public map and the studio both pick it. A long
 * jeepney trip is thirty or forty of these markers, each a button MapLibre
 * re-projects at every move — the one place a trip puts dozens of DOM markers
 * on the map, as many as the end titles at their most. TODO: count them in
 * the cheap-phone timer. The name still says stations, as it began with them;
 * a jeepney's hintuans ride along until a refactor renames it.
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
  // Further out, a smaller dot (hintuan-pin.css), so the stations read as
  // beads, not a wall; and along the rest, said for the suites, the ring's
  // colour being the dot's own class.
  useEffect(() => {
    el.toggleAttribute('data-far', !named);
    el.toggleAttribute('data-paled', paled);
  }, [el, named, paled]);
  // The dot and its name are one tap (the owner's call): one button around both.
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
