import type { GeoJSONSource, MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';

import { MAP_COLOURS } from '@/design-system/foundation/map-colours';
import { haversine, metresPerPixel, type LngLat } from '@/shared/utils/geo';

import {
  INSET_PX,
  SPEED_PX_PER_S,
  chevronsAt,
  markCovered,
  measure,
  spacingPx,
  type Chevron,
  type Measured,
  type View,
} from './chevrons';
import { TILE_BUFFER, useLayerReady } from './layers';
import { litWidthAt } from './line-style';
import type { LineLook } from './livery-line';
import { REST_LAYER, restDrawn } from './ride-rest';
import { ROUTES_HIT_LAYER } from './tap';

/**
 * Which way the jeep goes, drawn on the lit directions only; each end of
 * each is circled and named by end-titles.tsx (the owner's asks of
 * 2026-09-25; the circles were a layer of this hook's until his ask of
 * 2026-10-12 made them the hintuan's own dot).
 *
 * Decided with the owner 2026-09-23: marks *inside* the line, never as a
 * second offset line, only on what is lit — on every resting line they would
 * be clutter once a road carries three routes — and **flowing smoothly**
 * along it from the start of the ride to its end, for as long as it is lit
 * (STEP_MS). No glow: he asked for it
 * and then asked for it gone. What is lit is the chosen direction; or, since
 * 2026-09-29, the Selected RouteCard's directions (a route list's card or a
 * hotspot's); or else every route a list shows, the way round it shows them
 * (since 2026-09-25), or a hotspot's cards do (2026-09-29). Where two of
 * those share a road they flow as one stream, not two.
 *
 * The mark is a white chevron (near-black, Arrow/Inverse, on a yellow or a
 * mist line, until mist left on 2026-09-30 and yellow on 2026-10-12; since
 * 2026-09-29: useRideColours), one to a place and all alike, with
 * no trail: his call the night of 2026-09-23, after white arrows, a train of
 * four fading chevrons ("not good visually") and jeepneys (parked for a
 * Simulate button, PLAN.md). It is a chevron bigger than the line and cut off
 * by it: its arms run out to the line's edges and stop there, so none of it
 * shows outside the line.
 *
 * MapLibre can neither slide a mark along a line nor clip one to a line's
 * width, so each chevron is a small polygon we draw ourselves: every frame,
 * each one moves a little further along the line, is turned to its bearing
 * there, and is shaped in screen pixels to the lit line's width at that
 * zoom — crisp at every size, where a picture scaled from 5 px to 13 px
 * would blur or shimmer. The line handed in is already in travel order
 * (`travelLine`), so chevron number one leaves the terminal the title names,
 * whichever end it was drawn from; a ride picked backwards turns it round
 * (flowLines).
 */

const SRC = 'direction-arrows';
const CHEVRONS = 'direction-arrow-chevrons';
/** Two ends of one name closer than this are one place, and named once: Tala, where two rides start. */
const SAME_END_M = 150;

/**
 * One lit ride: its direction, its line in travel order, and the places it
 * runs from and to; and `pale`, the way not ridden when an end is picked on
 * its trip, after a start or not (useRideTo's ridden): the line on either
 * side of the ride. useRideRest draws it in the card's pale, and an end circle
 * on it wears the pale too and loses its S or E (EndTitles), the picks' pins
 * carrying them. The chevrons flow on along the pale, white on it as on the
 * line (the owner's ask, 2026-10-13: "continue the arrow into the pale
 * lines", and of two colours tried, "I love the white"); they stopped at the
 * pick from 2026-10-02 until then. `isBackwards`: an end picked above the
 * start, ridden back along the line, and the chevrons along the whole of it
 * flow from the S to the E, the line itself still in travel order for its
 * ends (the owner, 2026-10-16: "the arrow in route line change the flow …
 * in accordance with start and endpoint selected"). `isUnmarked`: a start
 * picked on its trip with no ride drawn, alone or with an end the line can't
 * take it to: both its ends lose their S and E, the start's pin carrying the
 * S (the owner, 2026-10-16: "Nothing yet, just the S"); its `pale` is then
 * the whole line, the ends on it (useLitRides; his ask the same night, "the
 * rouline would be in pale").
 */
export interface Ride {
  id?: string;
  line: readonly LngLat[];
  pale?: readonly (readonly LngLat[])[];
  isBackwards?: boolean;
  isUnmarked?: boolean;
  from: string;
  to: string;
  fromHotspot?: string | null;
  toHotspot?: string | null;
  /** Its route's code: a train's names its line, LRT-1, so its ends are named with their stations' codes (EndTitles). */
  routeCode?: string | null;
}

/**
 * An end of a lit ride: where it is, its place, whether it is the one of its
 * place that carries the name, its hotspot, when the ride says which, and
 * the directions of every lit ride that ends there, this way round
 * (`rides`, on the named one only: the rest are empty); `of`, the ride's own
 * direction, when it has an id; `paled`, where the ride picked on its trip
 * starts after it or ends before it, the line there drawn in the card's
 * pale; and `isMarked`, whether it wears its S or E: not on the pale, nor on
 * a trip whose start is picked with no ride drawn (Ride's `isUnmarked`).
 * `mark`, which of the two it wears: the origin's S and the destination's
 * E, turned round on a ride picked backwards, whose E an origin picked from
 * its row is (the owner, 2026-10-16: "keep the start").
 */
interface RideEnd {
  end: 'from' | 'to';
  name: string;
  named: boolean;
  at: LngLat;
  hotspotId: string | null;
  rides: string[];
  of: string | null;
  paled: boolean;
  isMarked: boolean;
  mark: 'start' | 'end';
}

/**
 * Where each lit ride starts and finishes, each place named once: two ends
 * of one name closer than SAME_END_M are one place (Tala, where two rides
 * start). end-titles.tsx circles every end and names the named ones; the
 * end of a ride whose rest is drawn (`paled`) wears the rest's pale.
 */
export function rideEnds(rides: readonly Ride[]): RideEnd[] {
  const named: RideEnd[] = [];
  return rides
    .filter((r) => r.line.length > 1)
    .flatMap((r) =>
      (
        [
          ['from', r.from, r.line[0], r.fromHotspot ?? null],
          ['to', r.to, r.line[r.line.length - 1], r.toHotspot ?? null],
        ] as const
      ).map(([end, name, at, hotspotId]) => {
        const same = name
          ? named.find((n) => n.name === name && haversine(n.at, at) < SAME_END_M)
          : undefined;
        if (same && same.end === end && r.id) same.rides.push(r.id);
        const paled = (r.pale ?? []).some(
          (l) => restDrawn(l) && samePoint(end === 'from' ? l[0] : l[l.length - 1], at),
        );
        const e: RideEnd = {
          end,
          name,
          named: !!name && !same,
          at,
          hotspotId,
          rides: !same && r.id ? [r.id] : [],
          of: r.id ?? null,
          paled,
          isMarked: !paled && !r.isUnmarked,
          mark: markOf(end, r.isBackwards ?? false),
        };
        if (e.named) named.push(e);
        return e;
      }),
    );
}

/** Which mark an end wears: the origin's S and the destination's E, the other way round on a ride picked backwards. */
function markOf(end: 'from' | 'to', isBackwards: boolean): 'start' | 'end' {
  if (isBackwards) return end === 'from' ? 'end' : 'start';
  return end === 'from' ? 'start' : 'end';
}

/**
 * The line each lit ride's chevrons flow along: the whole of it, on past a
 * picked hintuan too, and turned round for a ride picked backwards (Ride's
 * `isBackwards`), so they flow from its S to its E.
 */
export function flowLines(rides: readonly Ride[]): (readonly LngLat[])[] {
  return rides.map((r) => (r.isBackwards ? [...r.line].reverse() : r.line));
}

/** Whether two points are one: a pale stretch starting or ending where the line does. */
function samePoint(a: LngLat, b: LngLat): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * How often they move on: fifteen times a second. They flow for as long as
 * a route is lit (the owner's ask of 2026-09-30: "yes continuous arrows"),
 * after flowing for three seconds and resting since 2026-09-29, when a flow
 * at thirty frames kept a phone's main thread nine-tenths busy (a CPU slowed
 * 4×: 17 fps flowing, 60 at rest). At 28 px a second a step of about 2 px
 * still reads as a flow, for half that work; and it holds while the map is
 * dragged or zoomed, so moving the map keeps the whole frame to itself.
 */
const STEP_MS = 1000 / 15;

/**
 * Steps that came this late, one after another for this long, and they rest
 * where they are, as when asked to keep still: on a phone that cannot draw
 * the map four times a second, each step took the whole frame and a tap
 * waited seconds for its turn (a GitHub runner, 2026-10-01: the trip card's
 * buttons answering five seconds late, 13 frames in 8 s; 51 ms with them
 * still). Counted in time, not steps: three slow steps were under a second,
 * and a runner's short stall as tiles came in rested a flow that keeps up
 * (visitor-test on #95, 2026-10-01); a phone that cannot keep up stays slow.
 *
 * For WARM_MS after they start, after the map zooms and after a hidden page
 * comes back, no step counts: a new view's first frames are its dearest —
 * its tiles read and laid out — and say little of what the next ones will
 * cost (a GitHub runner, 2026-10-01: a jump to street zoom drew a few slow
 * frames, and the flow rested where it keeps up easily). A gap past AWAY_MS
 * is the page having been away, not a slow step. Rested, they try again only
 * once the map has zoomed a level or more — another view, another cost; a
 * pan, as the locator's camera makes each second, is the same view's.
 */
const SLOW_STEP_MS = 4 * STEP_MS;
const SLOW_FOR_MS = 2000;
const WARM_MS = 1500;
const AWAY_MS = 2000;

/** Whether this browser has been asked to keep still. */
function stillPlease(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The chevrons' colour and the rest of the line past a picked hintuan: the
 * selected blue's white chevrons unless the public map says otherwise — a
 * picked card's or an open trip's (livery-line.ts) — and the rest in the
 * card's pale (the owner's ask, 2026-10-12: the remaining line should be
 * surface-pale of the selected colour). The end circles wear the line's
 * colour by their own classes (EndTitles), nothing to paint since they left
 * the map's layers the same day.
 */
export function useRideColours(map: MapLibreMap | null, look: LineLook) {
  // The chevrons' hook adds their layer; wait for it.
  const ready = useLayerReady(map, CHEVRONS);
  useEffect(() => {
    if (!map || !ready) return;
    map.setPaintProperty(CHEVRONS, 'fill-color', look.arrow);
  }, [map, look.arrow, ready]);
  // The rest is another hook's layer (ride-rest.ts), added once the lit line
  // is there: waited for the same way, and painted as it arrives.
  const restReady = useLayerReady(map, REST_LAYER);
  useEffect(() => {
    if (!map || !restReady) return;
    map.setPaintProperty(REST_LAYER, 'line-color', look.pale);
  }, [map, look.pale, restReady]);
}

/**
 * The chevrons' source and layer, added to `map` under the routes' hit
 * area, which must be there: what useDirectionArrows adds, apart so a unit
 * check can read it (map-sources-test).
 */
export function addDirectionArrows(map: Pick<MapLibreMap, 'addSource' | 'addLayer'>): void {
  map.addSource(SRC, {
    type: 'geojson',
    buffer: TILE_BUFFER,
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer(
    {
      id: CHEVRONS,
      type: 'fill',
      source: SRC,
      // No fade between colours: they change with what is lit, in its frame.
      paint: {
        'fill-color': MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
        'fill-color-transition': { duration: 0, delay: 0 },
      },
    },
    ROUTES_HIT_LAYER,
  );
}

/** What of the map is on screen now, and at what zoom. */
function viewOf(map: MapLibreMap): View {
  const b = map.getBounds();
  return {
    west: b.getWest(),
    east: b.getEast(),
    south: b.getSouth(),
    north: b.getNorth(),
    zoom: map.getZoom(),
  };
}

/** `view` a screen wider each way: three of its widths across and three of its heights up. */
export function widened(view: View): View {
  const w = view.east - view.west;
  const h = view.north - view.south;
  return {
    west: view.west - w,
    east: view.east + w,
    south: view.south - h,
    north: view.north + h,
    zoom: view.zoom,
  };
}

/**
 * What a move of the map does to the chevrons, which do not flow while it
 * moves (the cheap-phone plan, step 17, 2026-10-04):
 * - 'hold': nothing, while the view stays inside the window they were last
 *   drawn for (`held`) at its zoom: every chevron it can show is there,
 *   the same polygon a draw for the view would make;
 * - 'wide': drawn again a screen wider each way, as the map pans at the
 *   zoom they were last drawn at (`drawnAt`) and leaves the window;
 * - 'view': drawn for the view, while the zoom changes, each frame changing
 *   their size and spacing.
 * They were drawn for the view at every move: each frame of a pan was a
 * new source for MapLibre's worker to cut into tiles.
 */
export function onAMove(held: View | null, drawnAt: number, now: View): 'hold' | 'wide' | 'view' {
  if (
    held &&
    now.zoom === held.zoom &&
    now.west >= held.west &&
    now.east <= held.east &&
    now.south >= held.south &&
    now.north <= held.north
  )
    return 'hold';
  return now.zoom === drawnAt ? 'wide' : 'view';
}

/**
 * Draw chevrons along each ride's line, flowing for as long as it is lit
 * (STEP_MS); nothing when there are none. Each ride's ends are EndTitles'
 * to circle and name. Pass the same array while what is lit is
 * unchanged (a memo), or the flow restarts.
 */
export function useDirectionArrows(map: MapLibreMap | null, rides: readonly Ride[]): void {
  const lines = useMemo(() => flowLines(rides), [rides]);
  const hitReady = useLayerReady(map, ROUTES_HIT_LAYER);
  useEffect(() => {
    // Over the lit line and its orange stretches, under the hit area and the
    // basemap's labels: the line hook's layers must be there first, and are,
    // since it is called before this one on both surfaces. The ends' circles
    // and names are DOM markers (EndTitles), on top of everything, so a
    // street name gives way to them rather than the other way round.
    if (!map || map.getSource(SRC) || !hitReady) return;
    addDirectionArrows(map);
  }, [map, hitReady]);

  const frame = useRef(0);
  useEffect(() => {
    const src = map?.getSource(SRC) as GeoJSONSource | undefined;
    if (!map || !src) return;
    const drawn = lines.filter((l) => l.length > 1);
    if (drawn.length === 0) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    const measured: Measured[] = [];
    for (const l of drawn) {
      const m = measure(l);
      markCovered(m, measured);
      measured.push(m);
    }
    const still = stillPlease();
    // How far they have flowed, in ms of flowing: not while the map moves.
    let flowed = 0;
    let last = performance.now();
    let moving = false;
    /** How long the steps have come late, one after another. */
    let slow = 0;
    let warmUntil = last + WARM_MS;
    /** The zoom they rested at, or null while they flow; and the zoom the map last came to rest at. */
    let restedAt: number | null = null;
    let zoomAt = map.getZoom();
    /** What they were last drawn for while the map moves, a screen wider each way (held), or null: the view itself. And at what zoom. */
    let held: View | null = null;
    let drawnAt = zoomAt;
    /** Drawn for the view on screen, or for it `wide`ned a screen each way. */
    const draw = (wide = false) => {
      const now = viewOf(map);
      const view = wide ? widened(now) : now;
      const zoom = view.zoom;
      held = wide ? view : null;
      drawnAt = zoom;
      const across = Math.max(0, litWidthAt(zoom) - 2 * INSET_PX);
      const features: Chevron[] = [];
      for (const m of measured) {
        const mpp = metresPerPixel(m.lat, zoom);
        const spacing = spacingPx(zoom) * mpp;
        const offset = still ? spacing / 2 : ((flowed / 1000) * SPEED_PX_PER_S * mpp) % spacing;
        chevronsAt(m, offset, spacing, across, view, features);
      }
      src.setData({ type: 'FeatureCollection', features });
    };
    // Moved, the map draws them again where they are: a zoom changes their
    // size and spacing, a pan brings new line on screen. A pan at one zoom
    // finds them drawn a screen wider each way as it began, and draws them
    // again only once it leaves that (onAMove); they do not flow while the
    // map moves, so what is on screen is the same.
    const onMove = () => {
      const how = onAMove(held, drawnAt, viewOf(map));
      if (how !== 'hold') draw(how === 'wide');
    };
    // A camera call made while another moves the map hotspots that one, which
    // says 'moveend', and says 'movestart' at once for its own (MapLibre's
    // easeTo: _stop, then _prepareEase): the compass camera eases at every
    // turn of the phone of 3° or more (use-locator.ts), thirty times for a
    // quarter turn made in a second. So the draw back to the view waits for
    // the next frame, and is dropped if a move starts first; and a move that
    // starts inside what is held, at its zoom, draws nothing. Back to back,
    // such eases cost no draw, where each had cost two, one of them nine
    // screens' worth (review of step 17, 2026-10-05). What is on screen is
    // the same: what is held has every chevron a draw for the view makes.
    let settle = 0;
    const onStart = () => {
      moving = true;
      cancelAnimationFrame(settle);
      settle = 0;
      if (onAMove(held, drawnAt, viewOf(map)) !== 'hold') draw(true);
    };
    const onEnd = () => {
      // Back to the view itself once it stops, as the steps draw them: a
      // frame on, and only if nothing has drawn them since.
      if (held)
        settle = requestAnimationFrame(() => {
          settle = 0;
          if (held) draw();
        });
      moving = false;
      last = performance.now();
      const zoom = map.getZoom();
      if (restedAt === null) {
        // Zoomed: the new view's first frames are warm-up, its count afresh.
        if (Math.abs(zoom - zoomAt) >= 1) {
          slow = 0;
          warmUntil = last + WARM_MS;
        }
      } else if (Math.abs(zoom - restedAt) >= 1) {
        // Rested for being slow, and another view now: they try again.
        restedAt = null;
        slow = 0;
        warmUntil = last + WARM_MS;
        frame.current = requestAnimationFrame(tick);
      }
      zoomAt = zoom;
    };
    const tick = (now: number) => {
      if (moving || now - last < STEP_MS) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      const gap = now - last;
      if (gap > AWAY_MS) warmUntil = now + WARM_MS;
      slow = now < warmUntil ? 0 : gap > SLOW_STEP_MS ? slow + gap : 0;
      // Too slow to flow: they rest where they are.
      if (slow >= SLOW_FOR_MS) {
        restedAt = map.getZoom();
        return;
      }
      frame.current = requestAnimationFrame(tick);
      // Back from a hidden page, or a long frame: one step on, not a leap.
      flowed += Math.min(gap, 2 * STEP_MS);
      last = now;
      draw();
    };
    draw();
    map.on('move', onMove);
    map.on('movestart', onStart);
    map.on('moveend', onEnd);
    // Still, when the browser is asked to keep still; and a hidden page
    // runs no frames at all.
    if (!still) frame.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(settle);
      map.off('move', onMove);
      map.off('movestart', onStart);
      map.off('moveend', onEnd);
    };
  }, [map, lines, hitReady]);
}
